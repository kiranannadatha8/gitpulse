import * as Sentry from "@sentry/react";

export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    // Capture 20% of sessions for performance in prod, 100% in dev
    tracesSampleRate: import.meta.env.PROD ? 0.2 : 1.0,
    // Don't send user PII by default
    sendDefaultPii: false,
    integrations: [Sentry.browserTracingIntegration()],
  });
}

export function captureError(
  err: Error,
  context?: Record<string, unknown>
): void {
  if (!import.meta.env.VITE_SENTRY_DSN) return;

  Sentry.withScope((scope) => {
    if (context) scope.setExtras(context);
    Sentry.captureException(err);
  });
}
