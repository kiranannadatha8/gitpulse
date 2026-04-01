import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";

// Mock env so session.ts can be imported without real values
vi.mock("../../lib/env.js", () => ({
  env: {
    DATABASE_URL: "postgresql://localhost/test",
    SESSION_SECRET: "test-secret-at-least-32-characters-long!",
    NODE_ENV: "test",
    PORT: 3001,
    FRONTEND_URL: "http://localhost:5173",
    GITHUB_TOKEN: "test-token",
    OPENAI_API_KEY: "test-key",
    GITHUB_CLIENT_ID: "test-client-id",
    GITHUB_CLIENT_SECRET: "test-client-secret",
  },
}));

// Prevent connect-pg-simple from creating real PG connections.
// express-session requires the store to implement EventEmitter (.on method).
vi.mock("connect-pg-simple", () => ({
  default: () =>
    class MockPgStore {
      on() {}
      get(_sid: string, cb: (err: null, session: null) => void) {
        cb(null, null);
      }
      set(_sid: string, _sess: object, cb: () => void) {
        cb();
      }
      destroy(_sid: string, cb: () => void) {
        cb();
      }
    },
}));

import { attachSessionId, sessionMiddleware } from "../session.js";

describe("attachSessionId", () => {
  let next: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    next = vi.fn();
  });

  it("sets req.sessionId to req.session.id", () => {
    const req = { session: { id: "session-abc-123" } } as unknown as Request;

    attachSessionId(req, {} as Response, next as NextFunction);

    expect((req as Request & { sessionId: string }).sessionId).toBe(
      "session-abc-123"
    );
  });

  it("always calls next() once", () => {
    const req = { session: { id: "any-id" } } as unknown as Request;

    attachSessionId(req, {} as Response, next as NextFunction);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });

  it("passes the exact session.id value through to sessionId", () => {
    const id = "unique-session-id-xyz-789";
    const req = { session: { id } } as unknown as Request;

    attachSessionId(req, {} as Response, next as NextFunction);

    expect((req as Request & { sessionId: string }).sessionId).toBe(id);
  });

  it("overwrites any pre-existing sessionId on req", () => {
    const req = {
      session: { id: "new-id" },
      sessionId: "old-id",
    } as unknown as Request;

    attachSessionId(req, {} as Response, next as NextFunction);

    expect((req as Request & { sessionId: string }).sessionId).toBe("new-id");
  });
});

describe("sessionMiddleware", () => {
  it("is exported as a middleware function", () => {
    expect(typeof sessionMiddleware).toBe("function");
  });
});
