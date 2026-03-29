import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock @anthropic-ai/sdk before importing the module under test
vi.mock("@anthropic-ai/sdk", () => {
  const mockCreate = vi.fn();
  const MockAnthropic = vi.fn(() => ({
    messages: {
      create: mockCreate,
    },
  }));
  return { default: MockAnthropic, Anthropic: MockAnthropic };
});

// Mock env
vi.mock("../../lib/env.js", () => ({
  env: {
    GITHUB_TOKEN: "test-token",
    ANTHROPIC_API_KEY: "test-anthropic-key",
    DATABASE_URL: "postgresql://localhost/test",
    PORT: 3001,
    FRONTEND_URL: "http://localhost:5173",
    NODE_ENV: "test",
  },
}));

import Anthropic from "@anthropic-ai/sdk";
import { analyzeDiff, ClaudeParseError } from "../claude.js";

const MockAnthropic = Anthropic as unknown as ReturnType<typeof vi.fn>;

const VALID_CLAUDE_RESPONSE = {
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

function makeMessageResponse(content: string) {
  return {
    content: [{ type: "text", text: content }],
  };
}

describe("analyzeDiff", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("parses and returns a valid Claude JSON response", async () => {
    MockAnthropic.mockImplementationOnce(() => ({
      messages: {
        create: vi.fn().mockResolvedValue(
          makeMessageResponse(JSON.stringify(VALID_CLAUDE_RESPONSE))
        ),
      },
    }));

    const result = await analyzeDiff("Fix auth bug", [
      { filename: "src/auth.ts", status: "modified", patch: "- bad\n+ good" },
    ]);

    expect(result.summary).toBe(
      "This PR fixes a critical bug in the authentication flow."
    );
    expect(result.riskLevel).toBe("high");
    expect(result.fileReviews).toHaveLength(1);
    expect(result.fileReviews[0].filename).toBe("src/auth.ts");
    expect(result.fileReviews[0].comments).toHaveLength(2);
  });

  it("retries once when first response is malformed JSON", async () => {
    const mockCreate = vi
      .fn()
      .mockResolvedValueOnce(makeMessageResponse("not valid json {{{{"))
      .mockResolvedValueOnce(
        makeMessageResponse(JSON.stringify(VALID_CLAUDE_RESPONSE))
      );

    MockAnthropic.mockImplementationOnce(() => ({
      messages: { create: mockCreate },
    }));

    const result = await analyzeDiff("Fix auth bug", [
      { filename: "src/auth.ts", status: "modified", patch: "+ fix" },
    ]);

    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(result.riskLevel).toBe("high");
  });

  it("retries once when first response fails Zod validation", async () => {
    const invalidResponse = {
      summary: "ok",
      riskLevel: "INVALID_LEVEL", // not in enum
      fileReviews: [],
    };

    const mockCreate = vi
      .fn()
      .mockResolvedValueOnce(
        makeMessageResponse(JSON.stringify(invalidResponse))
      )
      .mockResolvedValueOnce(
        makeMessageResponse(JSON.stringify(VALID_CLAUDE_RESPONSE))
      );

    MockAnthropic.mockImplementationOnce(() => ({
      messages: { create: mockCreate },
    }));

    const result = await analyzeDiff("Fix auth bug", []);

    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(result.summary).toBe(
      "This PR fixes a critical bug in the authentication flow."
    );
  });

  it("throws ClaudeParseError when both attempts fail", async () => {
    const mockCreate = vi
      .fn()
      .mockResolvedValueOnce(makeMessageResponse("garbage response"))
      .mockResolvedValueOnce(makeMessageResponse("still garbage"));

    MockAnthropic.mockImplementationOnce(() => ({
      messages: { create: mockCreate },
    }));

    await expect(
      analyzeDiff("Fix auth bug", [
        { filename: "src/auth.ts", status: "modified", patch: "+ fix" },
      ])
    ).rejects.toThrow(ClaudeParseError);

    expect(mockCreate).toHaveBeenCalledTimes(2);
  });

  it("throws ClaudeParseError with second attempt JSON also invalid", async () => {
    const mockCreate = vi
      .fn()
      .mockResolvedValueOnce(makeMessageResponse("{}"))
      .mockResolvedValueOnce(makeMessageResponse("{}"));

    MockAnthropic.mockImplementationOnce(() => ({
      messages: { create: mockCreate },
    }));

    await expect(
      analyzeDiff("some PR", [])
    ).rejects.toThrow(ClaudeParseError);
  });

  it("ClaudeParseError extends Error and has correct name", () => {
    const err = new ClaudeParseError("parse failed");
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("ClaudeParseError");
    expect(err.message).toBe("parse failed");
  });

  it("handles empty files array gracefully", async () => {
    MockAnthropic.mockImplementationOnce(() => ({
      messages: {
        create: vi.fn().mockResolvedValue(
          makeMessageResponse(
            JSON.stringify({
              summary: "No files changed.",
              riskLevel: "low",
              fileReviews: [],
            })
          )
        ),
      },
    }));

    const result = await analyzeDiff("Empty PR", []);
    expect(result.summary).toBe("No files changed.");
    expect(result.fileReviews).toEqual([]);
  });

  it("second attempt includes JSON example in prompt for stricter guidance", async () => {
    const mockCreate = vi
      .fn()
      .mockResolvedValueOnce(makeMessageResponse("bad json"))
      .mockResolvedValueOnce(
        makeMessageResponse(JSON.stringify(VALID_CLAUDE_RESPONSE))
      );

    MockAnthropic.mockImplementationOnce(() => ({
      messages: { create: mockCreate },
    }));

    await analyzeDiff("Fix auth bug", []);

    const secondCallArgs = mockCreate.mock.calls[1];
    // The second call should exist and have messages
    expect(secondCallArgs).toBeDefined();
    const messages = secondCallArgs[0].messages;
    const userMessage = messages.find(
      (m: { role: string; content: string }) => m.role === "user"
    );
    // Second attempt should include JSON example or stricter instruction
    expect(userMessage.content).toContain("JSON");
  });
});
