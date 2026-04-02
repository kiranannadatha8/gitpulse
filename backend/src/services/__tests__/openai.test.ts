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
  keyChanges: ["Fix token validation", "Add unit tests"],
  riskLevel: "high" as const,
  fileReviews: [
    {
      filename: "src/auth.ts",
      comments: [
        {
          line: 42,
          category: "security" as const,
          severity: "error" as const,
          message: "Token is not validated before use",
          suggestion: "Add token validation before proceeding",
        },
        {
          line: null,
          category: "test" as const,
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

    const result = await analyzeDiff("Fix auth bug", null, [
      { filename: "src/auth.ts", status: "modified", patch: "- bad\n+ good" },
    ]);

    expect(result.summary).toBe(
      "This PR fixes a critical bug in the authentication flow."
    );
    expect(result.riskLevel).toBe("high");
    expect(result.keyChanges).toEqual(["Fix token validation", "Add unit tests"]);
    expect(result.fileReviews).toHaveLength(1);
    expect(result.fileReviews[0].comments).toHaveLength(2);
    expect(result.fileReviews[0].comments[0].category).toBe("security");
  });

  it("throws AIParseError when response is malformed JSON", async () => {
    mockCreate.mockResolvedValue(makeCompletionResponse("not valid json {{{{"));

    await expect(
      analyzeDiff("Fix auth bug", null, [
        { filename: "src/auth.ts", status: "modified", patch: "+ fix" },
      ])
    ).rejects.toThrow(AIParseError);

    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it("throws AIParseError when response fails Zod validation", async () => {
    const invalidResponse = { summary: "ok", riskLevel: "INVALID", fileReviews: [] };
    mockCreate.mockResolvedValue(
      makeCompletionResponse(JSON.stringify(invalidResponse))
    );

    await expect(analyzeDiff("Fix auth bug", null, [])).rejects.toThrow(AIParseError);
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it("throws AIParseError when OpenAI returns empty content", async () => {
    mockCreate.mockResolvedValue({ choices: [{ message: { content: null } }] });

    await expect(analyzeDiff("some PR", null, [])).rejects.toThrow(AIParseError);
  });

  it("throws AIParseError when OpenAI API call throws", async () => {
    mockCreate.mockRejectedValue(new Error("Network error"));

    await expect(analyzeDiff("Fix auth bug", null, [])).rejects.toThrow(AIParseError);
  });

  it("AIParseError extends Error and has correct name", () => {
    const err = new AIParseError("parse failed");
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("AIParseError");
    expect(err.message).toBe("parse failed");
  });

  it("handles empty files array gracefully", async () => {
    const minimalResponse = {
      summary: "No files.",
      keyChanges: ["No changes"],
      riskLevel: "low",
      fileReviews: [],
    };
    mockCreate.mockResolvedValue(
      makeCompletionResponse(JSON.stringify(minimalResponse))
    );

    const result = await analyzeDiff("Empty PR", null, []);
    expect(result.summary).toBe("No files.");
    expect(result.fileReviews).toEqual([]);
  });

  it("uses json_schema response_format for structured output", async () => {
    mockCreate.mockResolvedValue(
      makeCompletionResponse(JSON.stringify(VALID_RESPONSE))
    );

    await analyzeDiff("Fix auth bug", null, []);

    const callArgs = mockCreate.mock.calls[0][0] as {
      response_format: { type: string; json_schema: { name: string; strict: boolean } };
    };
    expect(callArgs.response_format.type).toBe("json_schema");
    expect(callArgs.response_format.json_schema.name).toBe("pr_review");
    expect(callArgs.response_format.json_schema.strict).toBe(true);
  });

  it("includes PR body in user message when prBody is provided", async () => {
    mockCreate.mockResolvedValue(
      makeCompletionResponse(JSON.stringify(VALID_RESPONSE))
    );

    await analyzeDiff("Fix auth bug", "This PR fixes a token validation issue.", []);

    const callArgs = mockCreate.mock.calls[0][0] as {
      messages: Array<{ role: string; content: string }>;
    };
    const userMessage = callArgs.messages.find((m) => m.role === "user");
    expect(userMessage?.content).toContain("This PR fixes a token validation issue.");
    expect(userMessage?.content).toContain("PR Description");
  });

  it("omits PR description section when prBody is null", async () => {
    mockCreate.mockResolvedValue(
      makeCompletionResponse(JSON.stringify(VALID_RESPONSE))
    );

    await analyzeDiff("Fix auth bug", null, []);

    const callArgs = mockCreate.mock.calls[0][0] as {
      messages: Array<{ role: string; content: string }>;
    };
    const userMessage = callArgs.messages.find((m) => m.role === "user");
    expect(userMessage?.content).not.toContain("PR Description");
  });

  it("makes exactly one API call (no retry logic)", async () => {
    mockCreate.mockResolvedValue(
      makeCompletionResponse(JSON.stringify(VALID_RESPONSE))
    );

    await analyzeDiff("Fix auth bug", null, []);

    expect(mockCreate).toHaveBeenCalledTimes(1);
  });
});
