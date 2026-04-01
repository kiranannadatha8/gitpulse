import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

// Mock pino-http so it doesn't require a real pino logger instance
vi.mock("pino-http", () => ({
  default: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));

// Mock env so app.ts can load without real env vars
vi.mock("../../lib/env.js", () => ({
  env: {
    GITHUB_TOKEN: "test-token",
    OPENAI_API_KEY: "test-key",
    DATABASE_URL: "postgresql://localhost/test",
    PORT: 3001,
    FRONTEND_URL: "http://localhost:5173",
    NODE_ENV: "test",
    GITHUB_CLIENT_ID: "test-client-id",
    GITHUB_CLIENT_SECRET: "test-client-secret",
    SESSION_SECRET: "test-secret-at-least-32-characters-long!",
  },
}));

// Mock session middleware to avoid real DB/PG connections
vi.mock("../../middleware/session.js", () => ({
  sessionMiddleware: (
    req: { session?: { id: string } },
    _res: unknown,
    next: () => void
  ) => {
    req.session = { id: "test-session-uuid" };
    next();
  },
  attachSessionId: (
    req: { session?: { id: string }; sessionId?: string },
    _res: unknown,
    next: () => void
  ) => {
    req.sessionId = req.session?.id ?? "test-session-uuid";
    next();
  },
}));

// Mock passport to avoid GitHub OAuth / DB deserialization
vi.mock("../../lib/passport.js", () => ({
  default: {
    initialize: () => (_req: unknown, _res: unknown, next: () => void) => next(),
    session: () => (_req: unknown, _res: unknown, next: () => void) => next(),
    authenticate: () => (_req: unknown, _res: unknown, next: () => void) => next(),
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
      expect.any(String),
      undefined
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

  it("passes req.sessionId from session middleware to createReview", async () => {
    mockCreateReview.mockResolvedValue(MOCK_REVIEW as never);

    await request(app)
      .post("/api/reviews")
      .send({ prUrl: "https://github.com/owner/repo/pull/42" });

    // sessionId comes from the mocked session middleware ("test-session-uuid")
    expect(mockCreateReview).toHaveBeenCalledWith(
      "https://github.com/owner/repo/pull/42",
      "test-session-uuid",
      undefined
    );
  });
});

describe("GET /api/reviews", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 with array of reviews", async () => {
    const reviews = [MOCK_REVIEW, { ...MOCK_REVIEW, id: "review-uuid-5678" }];
    mockGetReviewsBySession.mockResolvedValue(reviews as never);

    const sessionId = "b2c3d4e5-f6a7-4890-9bcd-ef0123456789";
    const res = await request(app)
      .get("/api/reviews")
      .set("Cookie", `sessionId=${sessionId}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(2);
    expect(mockGetReviewsBySession).toHaveBeenCalledWith(
      "test-session-uuid",
      undefined
    );
  });

  it("returns 200 with empty array when no reviews exist", async () => {
    mockGetReviewsBySession.mockResolvedValue([]);

    const res = await request(app)
      .get("/api/reviews")
      .set("Cookie", "sessionId=d4e5f6a7-b8c9-4012-bdef-012345678901");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("returns 500 when service throws unexpected error", async () => {
    mockGetReviewsBySession.mockRejectedValue(new Error("DB connection failed"));

    const res = await request(app)
      .get("/api/reviews")
      .set("Cookie", "sessionId=c3d4e5f6-a7b8-4901-acde-f01234567890");

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe("Internal server error.");
  });
});
