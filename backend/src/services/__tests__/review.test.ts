import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock all dependencies before importing the module under test
vi.mock("../../lib/parsePrUrl.js", () => ({
  parsePRUrl: vi.fn(),
  InvalidPRUrlError: class InvalidPRUrlError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "InvalidPRUrlError";
    }
  },
}));

vi.mock("../github.js", () => ({
  fetchPRDiff: vi.fn(),
  GitHubNotFoundError: class GitHubNotFoundError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "GitHubNotFoundError";
    }
  },
  GitHubAuthError: class GitHubAuthError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "GitHubAuthError";
    }
  },
  GitHubRateLimitError: class GitHubRateLimitError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "GitHubRateLimitError";
    }
  },
}));

vi.mock("../openai.js", () => ({
  analyzeDiff: vi.fn(),
  AIParseError: class AIParseError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "AIParseError";
    }
  },
}));

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    review: {
      create: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    account: {
      findFirst: vi.fn().mockResolvedValue(null), // no token by default
    },
  },
}));

import { parsePRUrl } from "../../lib/parsePrUrl.js";
import { fetchPRDiff } from "../github.js";
import { analyzeDiff } from "../openai.js";
import { prisma } from "../../lib/prisma.js";
import { createReview, getReviewsBySession, migrateSessionReviews } from "../review.js";

const mockParsePRUrl = vi.mocked(parsePRUrl);
const mockFetchPRDiff = vi.mocked(fetchPRDiff);
const mockAnalyzeDiff = vi.mocked(analyzeDiff);
const mockPrismaCreate = vi.mocked(prisma.review.create);
const mockPrismaFindMany = vi.mocked(prisma.review.findMany);
const mockPrismaUpdateMany = vi.mocked(prisma.review.updateMany);
const mockAccountFindFirst = vi.mocked(prisma.account.findFirst);

const MOCK_PR_URL = "https://github.com/owner/repo/pull/42";
const MOCK_SESSION_ID = "session-abc-123";

const MOCK_PARSED = {
  owner: "owner",
  repo: "repo",
  prNumber: 42,
};

const MOCK_DIFF = {
  title: "Fix critical bug",
  body: "Fixes the critical bug by updating the auth flow.",
  files: [
    { filename: "src/index.ts", status: "modified", patch: "- bad\n+ good" },
  ],
};

const MOCK_ANALYSIS = {
  summary: "This is a solid fix.",
  keyChanges: ["Fix critical bug", "Update tests"],
  riskLevel: "low" as const,
  fileReviews: [
    {
      filename: "src/index.ts",
      comments: [
        {
          line: 5,
          category: "bug" as const,
          severity: "info" as const,
          message: "Good refactor",
          suggestion: null,
        },
      ],
    },
  ],
};

const MOCK_REVIEW_RECORD = {
  id: "uuid-1234",
  sessionId: MOCK_SESSION_ID,
  prUrl: MOCK_PR_URL,
  prTitle: MOCK_DIFF.title,
  repoOwner: MOCK_PARSED.owner,
  repoName: MOCK_PARSED.repo,
  prNumber: MOCK_PARSED.prNumber,
  summary: MOCK_ANALYSIS.summary,
  fileReviews: MOCK_ANALYSIS.fileReviews,
  riskLevel: MOCK_ANALYSIS.riskLevel,
  createdAt: new Date("2024-01-01T00:00:00.000Z"),
};

describe("createReview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("happy path: calls parsePRUrl, fetchPRDiff, analyzeDiff, and prisma.create in order", async () => {
    mockParsePRUrl.mockReturnValue(MOCK_PARSED);
    mockFetchPRDiff.mockResolvedValue(MOCK_DIFF);
    mockAnalyzeDiff.mockResolvedValue(MOCK_ANALYSIS);
    mockPrismaCreate.mockResolvedValue(MOCK_REVIEW_RECORD as never);

    const result = await createReview(MOCK_PR_URL, MOCK_SESSION_ID);

    expect(mockParsePRUrl).toHaveBeenCalledWith(MOCK_PR_URL);
    // No userId → account lookup skipped → userAccessToken is undefined
    expect(mockFetchPRDiff).toHaveBeenCalledWith("owner", "repo", 42, undefined);
    expect(mockAnalyzeDiff).toHaveBeenCalledWith(
      MOCK_DIFF.title,
      MOCK_DIFF.body,
      MOCK_DIFF.files
    );
    expect(mockPrismaCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        sessionId: MOCK_SESSION_ID,
        prUrl: MOCK_PR_URL,
        prTitle: MOCK_DIFF.title,
        repoOwner: MOCK_PARSED.owner,
        repoName: MOCK_PARSED.repo,
        prNumber: MOCK_PARSED.prNumber,
        summary: MOCK_ANALYSIS.summary,
        keyChanges: MOCK_ANALYSIS.keyChanges,
        riskLevel: MOCK_ANALYSIS.riskLevel,
      }),
    });
    expect(result.id).toBe("uuid-1234");
    expect(result.prTitle).toBe("Fix critical bug");
  });

  it("propagates GitHubNotFoundError from fetchPRDiff", async () => {
    mockParsePRUrl.mockReturnValue(MOCK_PARSED);
    const ghError = new Error("PR not found");
    ghError.name = "GitHubNotFoundError";
    mockFetchPRDiff.mockRejectedValue(ghError);

    await expect(createReview(MOCK_PR_URL, MOCK_SESSION_ID)).rejects.toThrow(
      "PR not found"
    );
    expect(mockAnalyzeDiff).not.toHaveBeenCalled();
    expect(mockPrismaCreate).not.toHaveBeenCalled();
  });

  it("propagates ClaudeParseError from analyzeDiff", async () => {
    mockParsePRUrl.mockReturnValue(MOCK_PARSED);
    mockFetchPRDiff.mockResolvedValue(MOCK_DIFF);
    const claudeError = new Error("Claude parse failed");
    claudeError.name = "ClaudeParseError";
    mockAnalyzeDiff.mockRejectedValue(claudeError);

    await expect(createReview(MOCK_PR_URL, MOCK_SESSION_ID)).rejects.toThrow(
      "Claude parse failed"
    );
    expect(mockPrismaCreate).not.toHaveBeenCalled();
  });

  it("propagates InvalidPRUrlError from parsePRUrl", async () => {
    const urlError = new Error("Invalid PR URL");
    urlError.name = "InvalidPRUrlError";
    mockParsePRUrl.mockImplementation(() => {
      throw urlError;
    });

    await expect(createReview("bad-url", MOCK_SESSION_ID)).rejects.toThrow(
      "Invalid PR URL"
    );
    expect(mockFetchPRDiff).not.toHaveBeenCalled();
    expect(mockAnalyzeDiff).not.toHaveBeenCalled();
    expect(mockPrismaCreate).not.toHaveBeenCalled();
  });

  it("stores fileReviews as JSON-serializable data", async () => {
    mockParsePRUrl.mockReturnValue(MOCK_PARSED);
    mockFetchPRDiff.mockResolvedValue(MOCK_DIFF);
    mockAnalyzeDiff.mockResolvedValue(MOCK_ANALYSIS);
    mockPrismaCreate.mockResolvedValue(MOCK_REVIEW_RECORD as never);

    await createReview(MOCK_PR_URL, MOCK_SESSION_ID);

    const createCall = mockPrismaCreate.mock.calls[0][0];
    expect(createCall.data.fileReviews).toEqual(MOCK_ANALYSIS.fileReviews);
  });
});

describe("getReviewsBySession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns reviews ordered by createdAt desc for a given sessionId", async () => {
    const reviews = [MOCK_REVIEW_RECORD, { ...MOCK_REVIEW_RECORD, id: "uuid-5678" }];
    mockPrismaFindMany.mockResolvedValue(reviews as never);

    const result = await getReviewsBySession(MOCK_SESSION_ID);

    expect(mockPrismaFindMany).toHaveBeenCalledWith({
      where: { sessionId: MOCK_SESSION_ID },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("uuid-1234");
  });

  it("returns empty array when no reviews found", async () => {
    mockPrismaFindMany.mockResolvedValue([] as never);

    const result = await getReviewsBySession("nonexistent-session");

    expect(result).toEqual([]);
  });

  it("propagates Prisma errors", async () => {
    mockPrismaFindMany.mockRejectedValue(new Error("DB connection failed"));

    await expect(getReviewsBySession(MOCK_SESSION_ID)).rejects.toThrow(
      "DB connection failed"
    );
  });

  it("when userId is provided, queries by userId instead of sessionId", async () => {
    const userId = "user-uuid-abc";
    mockPrismaFindMany.mockResolvedValue([MOCK_REVIEW_RECORD] as never);

    await getReviewsBySession(MOCK_SESSION_ID, userId);

    expect(mockPrismaFindMany).toHaveBeenCalledWith({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  });
});

describe("createReview with userId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes userId to prisma when provided", async () => {
    const userId = "user-uuid-xyz";
    mockParsePRUrl.mockReturnValue(MOCK_PARSED);
    mockFetchPRDiff.mockResolvedValue(MOCK_DIFF);
    mockAnalyzeDiff.mockResolvedValue(MOCK_ANALYSIS);
    mockPrismaCreate.mockResolvedValue(MOCK_REVIEW_RECORD as never);
    mockAccountFindFirst.mockResolvedValue(null);

    await createReview(MOCK_PR_URL, MOCK_SESSION_ID, userId);

    expect(mockPrismaCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId }),
    });
  });

  it("stores userId as null when not provided", async () => {
    mockParsePRUrl.mockReturnValue(MOCK_PARSED);
    mockFetchPRDiff.mockResolvedValue(MOCK_DIFF);
    mockAnalyzeDiff.mockResolvedValue(MOCK_ANALYSIS);
    mockPrismaCreate.mockResolvedValue(MOCK_REVIEW_RECORD as never);

    await createReview(MOCK_PR_URL, MOCK_SESSION_ID);

    expect(mockPrismaCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: null }),
    });
  });

  it("looks up the user's OAuth token and passes it to fetchPRDiff", async () => {
    const userId = "user-uuid-xyz";
    mockParsePRUrl.mockReturnValue(MOCK_PARSED);
    mockFetchPRDiff.mockResolvedValue(MOCK_DIFF);
    mockAnalyzeDiff.mockResolvedValue(MOCK_ANALYSIS);
    mockPrismaCreate.mockResolvedValue(MOCK_REVIEW_RECORD as never);
    mockAccountFindFirst.mockResolvedValue({ accessToken: "gho_usertoken" } as never);

    await createReview(MOCK_PR_URL, MOCK_SESSION_ID, userId);

    expect(mockAccountFindFirst).toHaveBeenCalledWith({
      where: { userId, provider: "github" },
      select: { accessToken: true },
    });
    expect(mockFetchPRDiff).toHaveBeenCalledWith("owner", "repo", 42, "gho_usertoken");
  });

  it("passes undefined token to fetchPRDiff when account has no stored token", async () => {
    const userId = "user-uuid-xyz";
    mockParsePRUrl.mockReturnValue(MOCK_PARSED);
    mockFetchPRDiff.mockResolvedValue(MOCK_DIFF);
    mockAnalyzeDiff.mockResolvedValue(MOCK_ANALYSIS);
    mockPrismaCreate.mockResolvedValue(MOCK_REVIEW_RECORD as never);
    mockAccountFindFirst.mockResolvedValue(null);

    await createReview(MOCK_PR_URL, MOCK_SESSION_ID, userId);

    expect(mockFetchPRDiff).toHaveBeenCalledWith("owner", "repo", 42, undefined);
  });
});

describe("migrateSessionReviews", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates all null-userId reviews for the session to the given userId", async () => {
    mockPrismaUpdateMany.mockResolvedValue({ count: 3 } as never);
    const userId = "user-uuid-migrate";

    const count = await migrateSessionReviews(MOCK_SESSION_ID, userId);

    expect(mockPrismaUpdateMany).toHaveBeenCalledWith({
      where: { sessionId: MOCK_SESSION_ID, userId: null },
      data: { userId },
    });
    expect(count).toBe(3);
  });

  it("returns 0 when no reviews are migrated", async () => {
    mockPrismaUpdateMany.mockResolvedValue({ count: 0 } as never);

    const count = await migrateSessionReviews("empty-session", "user-uuid-none");

    expect(count).toBe(0);
  });

  it("propagates Prisma errors", async () => {
    mockPrismaUpdateMany.mockRejectedValue(new Error("DB error"));

    await expect(
      migrateSessionReviews(MOCK_SESSION_ID, "user-id")
    ).rejects.toThrow("DB error");
  });
});
