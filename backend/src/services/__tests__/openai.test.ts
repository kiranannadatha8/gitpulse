import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.hoisted runs during the hoist phase, before const declarations —
// this lets the vi.mock factory reference this function safely.
const mockCreate = vi.hoisted(() => vi.fn());

// Mock openai before importing the module under test.
// The singleton client is constructed at module load time using this mock.
vi.mock("openai", () => ({
  default: vi.fn(() => ({
    chat: {
      completions: {
        create: mockCreate,
      },
    },
  })),
}));

vi.mock("../../lib/env.js", () => ({
  env: {
    GITHUB_TOKEN: "test-token",
    OPENAI_API_KEY: "test-openai-key",
    DATABASE_URL: "postgresql://localhost/test",
    PORT: 3001,
    FRONTEND_URL: "http://localhost:5173",
    NODE_ENV: "test",
  },
}));

import { analyzeDiff, AIParseError } from "../openai.js";

const VALID_RESPONSE = {
  summary: "This PR fixes a critical bug in the authentication flow.",
  riskLevel: "high" as const,
  fileReviews: [
    {
      filename: "src/auth.ts",
      comments: [
        {
          line: 42,
          severity: "error" as const,
          message: "Token is not validated before use",
          suggestion: "Add token validation before proceeding",
        },
        {
          line: null,
          severity: "info" as const,
          message: "Consider adding more tests",
          suggestion: null,
        },
      ],
    },
  ],
};

function makeCompletionResponse(content: string) {
  return {
    choices: [{ message: { content } }],
  };
}

describe("analyzeDiff", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("parses and returns a valid OpenAI JSON response", async () => {
    mockCreate.mockResolvedValue(
      makeCompletionResponse(JSON.stringify(VALID_RESPONSE))
    );

    const result = await analyzeDiff("Fix auth bug", [
      { filename: "src/auth.ts", status: "modified", patch: "- bad\n+ good" },
    ]);

    expect(result.summary).toBe(
      "This PR fixes a critical bug in the authentication flow."
    );
    expect(result.riskLevel).toBe("high");
    expect(result.fileReviews).toHaveLength(1);
    expect(result.fileReviews[0].comments).toHaveLength(2);
  });

  it("retries once when first response is malformed JSON", async () => {
    mockCreate
      .mockResolvedValueOnce(makeCompletionResponse("not valid json {{{{"))
      .mockResolvedValueOnce(makeCompletionResponse(JSON.stringify(VALID_RESPONSE)));

    const result = await analyzeDiff("Fix auth bug", [
      { filename: "src/auth.ts", status: "modified", patch: "+ fix" },
    ]);

    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(result.riskLevel).toBe("high");
  });

  it("retries once when first response fails Zod validation", async () => {
    const invalidResponse = { summary: "ok", riskLevel: "INVALID", fileReviews: [] };

    mockCreate
      .mockResolvedValueOnce(makeCompletionResponse(JSON.stringify(invalidResponse)))
      .mockResolvedValueOnce(makeCompletionResponse(JSON.stringify(VALID_RESPONSE)));

    const result = await analyzeDiff("Fix auth bug", []);
    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(result.summary).toBe(
      "This PR fixes a critical bug in the authentication flow."
    );
  });

  it("throws AIParseError when both attempts fail", async () => {
    mockCreate
      .mockResolvedValueOnce(makeCompletionResponse("garbage"))
      .mockResolvedValueOnce(makeCompletionResponse("still garbage"));

    await expect(
      analyzeDiff("Fix auth bug", [
        { filename: "src/auth.ts", status: "modified", patch: "+ fix" },
      ])
    ).rejects.toThrow(AIParseError);

    expect(mockCreate).toHaveBeenCalledTimes(2);
  });

  it("throws AIParseError when response JSON fails schema on both attempts", async () => {
    mockCreate
      .mockResolvedValueOnce(makeCompletionResponse("{}"))
      .mockResolvedValueOnce(makeCompletionResponse("{}"));

    await expect(analyzeDiff("some PR", [])).rejects.toThrow(AIParseError);
  });

  it("AIParseError extends Error and has correct name", () => {
    const err = new AIParseError("parse failed");
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("AIParseError");
    expect(err.message).toBe("parse failed");
  });

  it("handles empty files array gracefully", async () => {
    mockCreate.mockResolvedValue(
      makeCompletionResponse(
        JSON.stringify({ summary: "No files.", riskLevel: "low", fileReviews: [] })
      )
    );

    const result = await analyzeDiff("Empty PR", []);
    expect(result.summary).toBe("No files.");
    expect(result.fileReviews).toEqual([]);
  });

  it("second attempt includes JSON instruction for stricter guidance", async () => {
    mockCreate
      .mockResolvedValueOnce(makeCompletionResponse("bad json"))
      .mockResolvedValueOnce(makeCompletionResponse(JSON.stringify(VALID_RESPONSE)));

    await analyzeDiff("Fix auth bug", []);

    const secondCallArgs = mockCreate.mock.calls[1];
    expect(secondCallArgs).toBeDefined();
    const messages = secondCallArgs[0].messages as Array<{ role: string; content: string }>;
    const userMessage = messages.find((m) => m.role === "user");
    expect(userMessage?.content).toContain("JSON");
  });
});
