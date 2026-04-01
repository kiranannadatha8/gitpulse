import * as Sentry from "@sentry/node";
import { env } from "./env.js";

export function initSentry(): void {
  if (!env.SENTRY_DSN) return;

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: env.NODE_ENV === "production" ? 0.2 : 1.0,
    // Don't send PII (user IP, headers) unless explicitly needed
    sendDefaultPii: false,
  });
}

/**
 * Capture an unexpected error (5xx class). Pass 4xx errors through — they are
 * expected application errors, not bugs.
 */
export function captureError(err: Error, context?: Record<string, unknown>): void {
  if (!env.SENTRY_DSN) return;

  Sentry.withScope((scope) => {
    if (context) scope.setExtras(context);
    Sentry.captureException(err);
  });
}
