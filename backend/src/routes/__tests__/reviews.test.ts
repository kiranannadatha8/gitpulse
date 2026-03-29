import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

// Mock env so app.ts can load without real env vars
vi.mock("../../lib/env.js", () => ({
  env: {
    GITHUB_TOKEN: "test-token",
    ANTHROPIC_API_KEY: "test-key",
    DATABASE_URL: "postgresql://localhost/test",
    PORT: 3001,
    FRONTEND_URL: "http://localhost:5173",
    NODE_ENV: "test",
  },
}));

// Mock logger to suppress output in tests
vi.mock("../../lib/logger.js", () => ({
  default: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock prisma to avoid DB connections
vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    review: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

// Mock services before importing app
vi.mock("../../services/review.js", () => ({
  createReview: vi.fn(),
  getReviewsBySession: vi.fn(),
}));

// Mock error classes used by errorHandler
vi.mock("../../lib/parsePrUrl.js", () => ({
  InvalidPRUrlError: class InvalidPRUrlError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "InvalidPRUrlError";
      Object.setPrototypeOf(this, InvalidPRUrlError.prototype);
    }
  },
  parsePRUrl: vi.fn(),
}));

vi.mock("../../services/github.js", () => ({
  GitHubNotFoundError: class GitHubNotFoundError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "GitHubNotFoundError";
      Object.setPrototypeOf(this, GitHubNotFoundError.prototype);
    }
  },
  GitHubAuthError: class GitHubAuthError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "GitHubAuthError";
      Object.setPrototypeOf(this, GitHubAuthError.prototype);
    }
  },
  GitHubRateLimitError: class GitHubRateLimitError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "GitHubRateLimitError";
      Object.setPrototypeOf(this, GitHubRateLimitError.prototype);
    }
  },
  fetchPRDiff: vi.fn(),
}));

vi.mock("../../services/claude.js", () => ({
  ClaudeParseError: class ClaudeParseError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "ClaudeParseError";
      Object.setPrototypeOf(this, ClaudeParseError.prototype);
    }
  },
  analyzeDiff: vi.fn(),
}));

vi.mock("uuid", () => ({
  v4: () => "test-session-uuid",
}));

import app from "../../app.js";
import { createReview, getReviewsBySession } from "../../services/review.js";
import { InvalidPRUrlError } from "../../lib/parsePrUrl.js";

const mockCreateReview = vi.mocked(createReview);
const mockGetReviewsBySession = vi.mocked(getReviewsBySession);

const MOCK_REVIEW = {
  id: "review-uuid-1234",
  sessionId: "test-session-uuid",
  prUrl: "https://github.com/owner/repo/pull/42",
  prTitle: "Fix auth bug",
  repoOwner: "owner",
  repoName: "repo",
  prNumber: 42,
  summary: "Looks good",
  fileReviews: [],
  riskLevel: "low",
  createdAt: new Date("2024-01-01T00:00:00.000Z"),
};

describe("POST /api/reviews", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 201 with review data for valid prUrl", async () => {
    mockCreateReview.mockResolvedValue(MOCK_REVIEW as never);

    const res = await request(app)
      .post("/api/reviews")
      .send({ prUrl: "https://github.com/owner/repo/pull/42" });

    expect(res.status).toBe(201);
    expect(res.body.id).toBe("review-uuid-1234");
    expect(res.body.prTitle).toBe("Fix auth bug");
    expect(mockCreateReview).toHaveBeenCalledWith(
      "https://github.com/owner/repo/pull/42",
      expect.any(String)
    );
  });

  it("returns 400 when prUrl is missing from body", async () => {
    const res = await request(app).post("/api/reviews").send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe("Invalid request.");
  });

  it("returns 400 when prUrl is not a valid URL", async () => {
    const res = await request(app)
      .post("/api/reviews")
      .send({ prUrl: "not-a-url" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("returns 400 when InvalidPRUrlError is thrown by createReview", async () => {
    mockCreateReview.mockRejectedValue(
      new InvalidPRUrlError("URL path must match /owner/repo/pull/{number}")
    );

    const res = await request(app)
      .post("/api/reviews")
      .send({ prUrl: "https://github.com/owner/repo/issues/42" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain("URL path must match");
  });

  it("sets sessionId cookie when no cookie is present", async () => {
    mockCreateReview.mockResolvedValue(MOCK_REVIEW as never);

    const res = await request(app)
      .post("/api/reviews")
      .send({ prUrl: "https://github.com/owner/repo/pull/42" });

    const setCookieHeader = res.headers["set-cookie"] as string[] | string | undefined;
    expect(setCookieHeader).toBeDefined();
    const cookieStr = Array.isArray(setCookieHeader)
      ? setCookieHeader.join("; ")
      : setCookieHeader ?? "";
    expect(cookieStr).toContain("sessionId=test-session-uuid");
  });

  it("preserves existing sessionId cookie when present", async () => {
    mockCreateReview.mockResolvedValue(MOCK_REVIEW as never);
    const existingSessionId = "existing-session-abc-123";

    const res = await request(app)
      .post("/api/reviews")
      .set("Cookie", `sessionId=${existingSessionId}`)
      .send({ prUrl: "https://github.com/owner/repo/pull/42" });

    expect(res.status).toBe(201);
    expect(mockCreateReview).toHaveBeenCalledWith(
      "https://github.com/owner/repo/pull/42",
      existingSessionId
    );
    // Should not set a new cookie when one already exists
    const setCookieHeader = res.headers["set-cookie"] as string[] | string | undefined;
    if (setCookieHeader) {
      const cookieStr = Array.isArray(setCookieHeader)
        ? setCookieHeader.join("; ")
        : setCookieHeader;
      expect(cookieStr).not.toContain("sessionId=test-session-uuid");
    }
  });
});

describe("GET /api/reviews", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 with array of reviews", async () => {
    const reviews = [MOCK_REVIEW, { ...MOCK_REVIEW, id: "review-uuid-5678" }];
    mockGetReviewsBySession.mockResolvedValue(reviews as never);

    const res = await request(app)
      .get("/api/reviews")
      .set("Cookie", "sessionId=my-session-id");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(2);
    expect(mockGetReviewsBySession).toHaveBeenCalledWith("my-session-id");
  });

  it("returns 200 with empty array when no reviews exist", async () => {
    mockGetReviewsBySession.mockResolvedValue([]);

    const res = await request(app)
      .get("/api/reviews")
      .set("Cookie", "sessionId=empty-session");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("returns 500 when service throws unexpected error", async () => {
    mockGetReviewsBySession.mockRejectedValue(new Error("DB connection failed"));

    const res = await request(app)
      .get("/api/reviews")
      .set("Cookie", "sessionId=some-session");

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe("Internal server error.");
  });
});
