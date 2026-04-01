import { describe, it, expect, vi } from "vitest";
import request from "supertest";

// Suppress pino-http in integration tests
vi.mock("pino-http", () => ({
  default: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));

// Provide required env vars without real secrets
vi.mock("../../lib/env.js", () => ({
  env: {
    GITHUB_TOKEN: "test-token",
    OPENAI_API_KEY: "test-key",
    DATABASE_URL: "postgresql://localhost/test",
    PORT: 3001,
    FRONTEND_URL: "http://localhost:5173",
    BACKEND_URL: "http://localhost:3001",
    NODE_ENV: "test",
    GITHUB_CLIENT_ID: "test-client-id",
    GITHUB_CLIENT_SECRET: "test-client-secret",
    SESSION_SECRET: "test-secret-at-least-32-characters-long!",
  },
}));

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

vi.mock("../../lib/passport.js", () => ({
  default: {
    initialize: () => (_req: unknown, _res: unknown, next: () => void) => next(),
    session: () => (_req: unknown, _res: unknown, next: () => void) => next(),
    authenticate: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  },
}));

vi.mock("../../lib/logger.js", () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    $queryRaw: vi.fn().mockResolvedValue([]),
    review: { create: vi.fn(), findMany: vi.fn() },
  },
}));

vi.mock("../../services/review.js", () => ({
  createReview: vi.fn(),
  getReviewsBySession: vi.fn().mockResolvedValue([]),
  migrateSessionReviews: vi.fn().mockResolvedValue(0),
}));

const { default: app } = await import("../../app.js");

describe("Security headers (Helmet)", () => {
  it("sets X-Content-Type-Options: nosniff", async () => {
    const res = await request(app).get("/api/health");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
  });

  it("sets X-Frame-Options: DENY", async () => {
    const res = await request(app).get("/api/health");
    expect(res.headers["x-frame-options"]).toBe("DENY");
  });

  it("sets X-XSS-Protection: 0", async () => {
    const res = await request(app).get("/api/health");
    // Helmet sets this to 0 (disables legacy XSS auditor which caused issues)
    expect(res.headers["x-xss-protection"]).toBe("0");
  });

  it("removes X-Powered-By header", async () => {
    const res = await request(app).get("/api/health");
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });

  it("sets Content-Security-Policy", async () => {
    const res = await request(app).get("/api/health");
    expect(res.headers["content-security-policy"]).toBeDefined();
    expect(res.headers["content-security-policy"]).toContain("default-src 'none'");
    expect(res.headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  });

  it("does not set Strict-Transport-Security in non-production", async () => {
    // HSTS is disabled in test/development to avoid breaking local HTTP
    const res = await request(app).get("/api/health");
    expect(res.headers["strict-transport-security"]).toBeUndefined();
  });
});

describe("Request body size limit", () => {
  it("rejects payloads larger than 100 KB", async () => {
    const bigPayload = { prUrl: "x".repeat(110 * 1024) };
    const res = await request(app)
      .post("/api/reviews")
      .send(bigPayload)
      .set("Content-Type", "application/json");
    expect(res.status).toBe(413);
  });
});
