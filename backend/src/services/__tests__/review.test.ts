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

vi.mock("../claude.js", () => ({
  analyzeDiff: vi.fn(),
  ClaudeParseError: class ClaudeParseError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "ClaudeParseError";
    }
  },
}));

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    review: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import { parsePRUrl } from "../../lib/parsePrUrl.js";
import { fetchPRDiff } from "../github.js";
import { analyzeDiff } from "../claude.js";
import { prisma } from "../../lib/prisma.js";
import { createReview, getReviewsBySession } from "../review.js";

const mockParsePRUrl = vi.mocked(parsePRUrl);
const mockFetchPRDiff = vi.mocked(fetchPRDiff);
const mockAnalyzeDiff = vi.mocked(analyzeDiff);
const mockPrismaCreate = vi.mocked(prisma.review.create);
const mockPrismaFindMany = vi.mocked(prisma.review.findMany);

const MOCK_PR_URL = "https://github.com/owner/repo/pull/42";
const MOCK_SESSION_ID = "session-abc-123";

const MOCK_PARSED = {
  owner: "owner",
  repo: "repo",
  prNumber: 42,
};

const MOCK_DIFF = {
  title: "Fix critical bug",
  files: [
    { filename: "src/index.ts", status: "modified", patch: "- bad\n+ good" },
  ],
};

const MOCK_ANALYSIS = {
  summary: "This is a solid fix.",
  riskLevel: "low" as const,
  fileReviews: [
    {
      filename: "src/index.ts",
      comments: [
        {
          line: 5,
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
    expect(mockFetchPRDiff).toHaveBeenCalledWith("owner", "repo", 42);
    expect(mockAnalyzeDiff).toHaveBeenCalledWith(
      MOCK_DIFF.title,
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
});
