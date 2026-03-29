import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";

vi.mock("uuid", () => ({
  v4: () => "test-uuid-1234",
}));

// Import after mocking
import { sessionMiddleware } from "../session.js";

function makeReq(cookies: Record<string, string> = {}): Partial<Request> & { cookies: Record<string, string> } {
  return { cookies } as Partial<Request> & { cookies: Record<string, string> };
}

function makeRes(): { cookie: ReturnType<typeof vi.fn>; [key: string]: unknown } {
  return { cookie: vi.fn() };
}

describe("sessionMiddleware", () => {
  let next: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    next = vi.fn();
  });

  it("sets new sessionId cookie and attaches to req when cookie is absent", () => {
    const req = makeReq();
    const res = makeRes();

    sessionMiddleware(req as Request, res as unknown as Response, next as NextFunction);

    expect((req as Request & { sessionId: string }).sessionId).toBe("test-uuid-1234");
    expect(res.cookie).toHaveBeenCalledWith(
      "sessionId",
      "test-uuid-1234",
      expect.objectContaining({
        httpOnly: true,
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000,
      })
    );
  });

  it("reuses existing sessionId from cookie when present", () => {
    const existingId = "existing-session-uuid-5678";
    const req = makeReq({ sessionId: existingId });
    const res = makeRes();

    sessionMiddleware(req as Request, res as unknown as Response, next as NextFunction);

    expect((req as Request & { sessionId: string }).sessionId).toBe(existingId);
    expect(res.cookie).not.toHaveBeenCalled();
  });

  it("always calls next()", () => {
    const req = makeReq();
    const res = makeRes();

    sessionMiddleware(req as Request, res as unknown as Response, next as NextFunction);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });

  it("always calls next() even when cookie is present", () => {
    const req = makeReq({ sessionId: "some-existing-id" });
    const res = makeRes();

    sessionMiddleware(req as Request, res as unknown as Response, next as NextFunction);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });

  it("cookie attributes: httpOnly=true, sameSite=lax, maxAge=30 days in ms", () => {
    const req = makeReq();
    const res = makeRes();

    sessionMiddleware(req as Request, res as unknown as Response, next as NextFunction);

    const cookieOptions = res.cookie.mock.calls[0][2] as {
      httpOnly: boolean;
      sameSite: string;
      maxAge: number;
    };

    expect(cookieOptions.httpOnly).toBe(true);
    expect(cookieOptions.sameSite).toBe("lax");
    expect(cookieOptions.maxAge).toBe(30 * 24 * 60 * 60 * 1000);
  });

  it("generates a new UUID when sessionId cookie is empty string", () => {
    const req = makeReq({ sessionId: "" });
    const res = makeRes();

    sessionMiddleware(req as Request, res as unknown as Response, next as NextFunction);

    expect((req as Request & { sessionId: string }).sessionId).toBe("test-uuid-1234");
    expect(res.cookie).toHaveBeenCalled();
  });
});
