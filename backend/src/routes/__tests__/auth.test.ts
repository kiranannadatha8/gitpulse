import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import type { Request, Response, NextFunction } from "express";

// Mock env
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

// Mock logger
vi.mock("../../lib/logger.js", () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

// Mock review service
vi.mock("../../services/review.js", () => ({
  migrateSessionReviews: vi.fn().mockResolvedValue(0),
  deleteUserReviews: vi.fn().mockResolvedValue(3),
}));

// Mock prisma for account data export and user deletion
vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    user: {
      findUniqueOrThrow: vi.fn().mockResolvedValue({
        id: "user-uuid-123",
        username: "testuser",
        displayName: "Test User",
        email: "test@example.com",
        avatarUrl: "https://avatars.githubusercontent.com/u/1",
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-01"),
      }),
      delete: vi.fn().mockResolvedValue({}),
    },
    review: {
      findMany: vi.fn().mockResolvedValue([
        { id: "rev-1", prUrl: "https://github.com/org/repo/pull/1", summary: "ok" },
      ]),
    },
  },
}));

// Mock passport — authenticate redirects are not tested here (OAuth flow)
vi.mock("../../lib/passport.js", () => ({
  default: {
    initialize: () => (_req: Request, _res: Response, next: NextFunction) =>
      next(),
    session: () => (_req: Request, _res: Response, next: NextFunction) =>
      next(),
    authenticate: () => (_req: Request, _res: Response, next: NextFunction) =>
      next(),
  },
}));

import authRouter from "../auth.js";
import { migrateSessionReviews, deleteUserReviews } from "../../services/review.js";
import { prisma } from "../../lib/prisma.js";

const mockMigrateSessionReviews = vi.mocked(migrateSessionReviews);
const mockDeleteUserReviews = vi.mocked(deleteUserReviews);
const mockPrisma = vi.mocked(prisma);

/** Build a minimal Express app that injects `user` and `session` onto req */
function buildApp(user?: {
  id: string;
  username: string;
  displayName: string | null;
  email: string | null;
  avatarUrl: string | null;
}) {
  const app = express();
  app.use(express.json());

  // Inject req.user and session
  app.use((req: Request, _res: Response, next: NextFunction) => {
    if (user) {
      // @ts-expect-error — test-only injection
      req.user = user;
    }
    (req as Request & { sessionId: string }).sessionId = "test-session-id";
    req.session = {
      id: "test-session-id",
      destroy: (cb: (err?: Error) => void) => cb(),
    } as unknown as typeof req.session;
    req.logout = (cb: (err?: Error) => void) => cb();
    next();
  });

  app.use("/api/auth", authRouter);
  return app;
}

const MOCK_USER = {
  id: "user-uuid-123",
  username: "testuser",
  displayName: "Test User",
  email: "test@example.com",
  avatarUrl: "https://avatars.githubusercontent.com/u/1",
};

describe("GET /api/auth/me", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns null when user is not authenticated", async () => {
    const app = buildApp();
    const res = await request(app).get("/api/auth/me");

    expect(res.status).toBe(200);
    expect(res.body).toBeNull();
  });

  it("returns user object when authenticated", async () => {
    const app = buildApp(MOCK_USER);
    const res = await request(app).get("/api/auth/me");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: MOCK_USER.id,
      username: MOCK_USER.username,
      displayName: MOCK_USER.displayName,
      email: MOCK_USER.email,
      avatarUrl: MOCK_USER.avatarUrl,
    });
  });

  it("does not expose internal Prisma fields", async () => {
    const app = buildApp(MOCK_USER);
    const res = await request(app).get("/api/auth/me");

    expect(res.body).not.toHaveProperty("githubId");
    expect(res.body).not.toHaveProperty("createdAt");
    expect(res.body).not.toHaveProperty("updatedAt");
  });
});

describe("POST /api/auth/logout", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns success:true after destroying session", async () => {
    const app = buildApp(MOCK_USER);
    const res = await request(app).post("/api/auth/logout");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
  });

  it("works when no user is authenticated", async () => {
    const app = buildApp();
    const res = await request(app).post("/api/auth/logout");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
  });
});

describe("GET /api/auth/github/callback — review migration", () => {
  beforeEach(() => vi.clearAllMocks());

  it("migrates anonymous session reviews to user after OAuth callback", async () => {
    mockMigrateSessionReviews.mockResolvedValue(2);
    const app = buildApp(MOCK_USER);

    // Simulate callback endpoint being hit with an authenticated user
    await request(app).get("/api/auth/github/callback");

    expect(mockMigrateSessionReviews).toHaveBeenCalledWith(
      "test-session-id",
      MOCK_USER.id
    );
  });

  it("skips migration when no user is set", async () => {
    const app = buildApp();
    await request(app).get("/api/auth/github/callback");

    expect(mockMigrateSessionReviews).not.toHaveBeenCalled();
  });
});

describe("GET /api/auth/account/data", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    const app = buildApp();
    const res = await request(app).get("/api/auth/account/data");
    expect(res.status).toBe(401);
  });

  it("returns user profile and reviews when authenticated", async () => {
    const app = buildApp(MOCK_USER);
    const res = await request(app).get("/api/auth/account/data");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("exportedAt");
    expect(res.body.user).toMatchObject({
      id: MOCK_USER.id,
      username: MOCK_USER.username,
    });
    expect(Array.isArray(res.body.reviews)).toBe(true);
    expect(mockPrisma.user.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { id: MOCK_USER.id },
    });
  });

  it("does not expose user.updatedAt or githubId in export", async () => {
    const app = buildApp(MOCK_USER);
    const res = await request(app).get("/api/auth/account/data");

    expect(res.body.user).not.toHaveProperty("githubId");
    expect(res.body.user).not.toHaveProperty("updatedAt");
  });
});

describe("DELETE /api/auth/account", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    const app = buildApp();
    const res = await request(app).delete("/api/auth/account");
    expect(res.status).toBe(401);
  });

  it("deletes reviews and user then returns success", async () => {
    const app = buildApp(MOCK_USER);
    const res = await request(app).delete("/api/auth/account");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
    expect(mockDeleteUserReviews).toHaveBeenCalledWith(MOCK_USER.id);
    expect(mockPrisma.user.delete).toHaveBeenCalledWith({
      where: { id: MOCK_USER.id },
    });
  });
});
