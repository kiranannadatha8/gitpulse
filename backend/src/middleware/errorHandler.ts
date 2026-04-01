import { type Request, type Response, type NextFunction } from "express";
import { ZodError } from "zod";
import { InvalidPRUrlError } from "../lib/parsePrUrl.js";
import {
  GitHubNotFoundError,
  GitHubAuthError,
  GitHubRateLimitError,
} from "../services/github.js";
import { AIParseError } from "../services/openai.js";
import logger from "../lib/logger.js";
import { captureError } from "../lib/sentry.js";

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // 4xx errors are expected application errors — log at warn, don't report to Sentry
  const isClientError =
    err instanceof InvalidPRUrlError ||
    err instanceof GitHubNotFoundError ||
    err instanceof ZodError;

  if (isClientError) {
    logger.warn({ err, path: req.path }, "Client error");
  } else {
    logger.error({ err, path: req.path }, "Server error");
    captureError(err, { path: req.path, method: req.method });
  }

  if (err instanceof InvalidPRUrlError) {
    res.status(400).json({ success: false, error: err.message });
    return;
  }

  if (err instanceof GitHubNotFoundError) {
    res.status(404).json({ success: false, error: "PR not found." });
    return;
  }

  if (err instanceof GitHubAuthError) {
    res.status(502).json({ success: false, error: "GitHub authentication failed." });
    return;
  }

  if (err instanceof GitHubRateLimitError) {
    res.status(502).json({ success: false, error: "GitHub rate limit reached. Try again later." });
    return;
  }

  if (err instanceof AIParseError) {
    res.status(502).json({ success: false, error: "AI analysis failed. Please try again." });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({ success: false, error: "Invalid request.", details: err.errors });
    return;
  }

  res.status(500).json({ success: false, error: "Internal server error." });
}
