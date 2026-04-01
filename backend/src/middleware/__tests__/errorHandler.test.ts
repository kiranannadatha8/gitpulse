import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { ZodError, z } from "zod";

// Mock the logger before importing anything that uses it
vi.mock("../../lib/logger.js", () => ({
  default: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock error classes from their source modules
vi.mock("../../lib/parsePrUrl.js", () => ({
  InvalidPRUrlError: class InvalidPRUrlError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "InvalidPRUrlError";
      Object.setPrototypeOf(this, InvalidPRUrlError.prototype);
    }
  },
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
}));

vi.mock("../../services/openai.js", () => ({
  AIParseError: class AIParseError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "AIParseError";
      Object.setPrototypeOf(this, AIParseError.prototype);
    }
  },
}));

import { errorHandler } from "../errorHandler.js";
import logger from "../../lib/logger.js";
import { InvalidPRUrlError } from "../../lib/parsePrUrl.js";
import {
  GitHubNotFoundError,
  GitHubAuthError,
  GitHubRateLimitError,
} from "../../services/github.js";
import { AIParseError } from "../../services/openai.js";

const mockLogger = vi.mocked(logger);

function makeRes(): {
  status: ReturnType<typeof vi.fn>;
  json: ReturnType<typeof vi.fn>;
  [key: string]: unknown;
} {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
  };
  res.status.mockReturnValue(res);
  return res;
}

const req = {} as Request;
const next = vi.fn() as unknown as NextFunction;

describe("errorHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps InvalidPRUrlError to 400 with error message", () => {
    const err = new InvalidPRUrlError("URL is invalid");
    const res = makeRes();

    errorHandler(err, req, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: "URL is invalid" });
  });

  it("maps GitHubNotFoundError to 404 with 'PR not found.' message", () => {
    const err = new GitHubNotFoundError("some details");
    const res = makeRes();

    errorHandler(err, req, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: "PR not found." });
  });

  it("maps GitHubAuthError to 502 with 'GitHub authentication failed.' message", () => {
    const err = new GitHubAuthError("401 auth failed");
    const res = makeRes();

    errorHandler(err, req, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(502);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: "GitHub authentication failed.",
    });
  });

  it("maps GitHubRateLimitError to 502 with rate limit message", () => {
    const err = new GitHubRateLimitError("rate limit reached");
    const res = makeRes();

    errorHandler(err, req, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(502);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: "GitHub rate limit reached. Try again later.",
    });
  });

  it("maps AIParseError to 502 with 'AI analysis failed.' message", () => {
    const err = new AIParseError("parse failed");
    const res = makeRes();

    errorHandler(err, req, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(502);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: "AI analysis failed. Please try again.",
    });
  });

  it("maps ZodError to 400 with 'Invalid request.' and details", () => {
    // Generate a real ZodError by parsing invalid data
    const zodErr = (() => {
      try {
        z.object({ name: z.string() }).parse({ name: 123 });
        throw new Error("should not reach here");
      } catch (e) {
        return e as ZodError;
      }
    })();

    const res = makeRes();

    errorHandler(zodErr, req, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(400);
    const jsonCall = res.json.mock.calls[0][0] as {
      success: boolean;
      error: string;
      details: unknown;
    };
    expect(jsonCall.success).toBe(false);
    expect(jsonCall.error).toBe("Invalid request.");
    expect(Array.isArray(jsonCall.details)).toBe(true);
  });

  it("maps generic Error to 500 with 'Internal server error.'", () => {
    const err = new Error("something unexpected");
    const res = makeRes();

    errorHandler(err, req, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: "Internal server error.",
    });
  });

  it("calls logger.error for 5xx error types and logger.warn for 4xx client errors", () => {
    // 5xx server errors — logged via logger.error
    const serverErrors = [
      new GitHubAuthError("auth fail"),
      new GitHubRateLimitError("rate limit"),
      new AIParseError("parse fail"),
      new Error("generic"),
    ];
    // 4xx client errors — logged via logger.warn
    const clientErrors = [
      new InvalidPRUrlError("bad url"),
      new GitHubNotFoundError("not found"),
    ];

    for (const err of [...serverErrors, ...clientErrors]) {
      const res = makeRes();
      errorHandler(err, req, res as unknown as Response, next);
    }

    expect(mockLogger.error).toHaveBeenCalledTimes(serverErrors.length);
    expect(mockLogger.warn).toHaveBeenCalledTimes(clientErrors.length);
  });

  it("calls logger.warn for ZodError (400 client error)", () => {
    const zodErr = (() => {
      try {
        z.string().parse(123);
        throw new Error("should not reach");
      } catch (e) {
        return e as ZodError;
      }
    })();

    const res = makeRes();
    errorHandler(zodErr, req, res as unknown as Response, next);

    expect(mockLogger.warn).toHaveBeenCalledTimes(1);
    expect(mockLogger.error).not.toHaveBeenCalled();
  });
});
