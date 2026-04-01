import { z } from "zod";
import "dotenv/config";

export const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY is required"),
  // ── GitHub OAuth App (for user login via Passport) ────────────────────────
  GITHUB_CLIENT_ID: z.string().min(1, "GITHUB_CLIENT_ID is required"),
  GITHUB_CLIENT_SECRET: z.string().min(1, "GITHUB_CLIENT_SECRET is required"),
  // ── GitHub App (for API calls — preferred over PAT) ───────────────────────
  // Register at: https://github.com/settings/apps/new
  // Permissions needed: Pull requests → Read-only, Contents → Read-only
  GITHUB_APP_ID: z.coerce.number().optional(),
  // Multi-line PEM key — newlines can be escaped as \n in env files
  GITHUB_APP_PRIVATE_KEY: z.string().optional(),
  // Installation ID from: https://github.com/settings/installations/<id>
  GITHUB_APP_INSTALLATION_ID: z.coerce.number().optional(),
  // ── PAT fallback (deprecated — use GitHub App instead) ───────────────────
  // Required only when GITHUB_APP_ID is not configured
  GITHUB_TOKEN: z.string().optional(),
  // ── Session ───────────────────────────────────────────────────────────────
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
  PORT: z.coerce.number().default(3001),
  FRONTEND_URL: z.string().url().default("http://localhost:5173"),
  BACKEND_URL: z.string().url().default("http://localhost:3001"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  // ── Observability ─────────────────────────────────────────────────────────
  SENTRY_DSN: z.string().url().optional(),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const missing = parsed.error.errors.map((e) => `  ${e.path.join(".")}: ${e.message}`).join("\n");
  throw new Error(`Missing or invalid environment variables:\n${missing}`);
}

export const env = parsed.data;

// Ensure at least one GitHub API auth method is configured.
// GitHub App (GITHUB_APP_ID + GITHUB_APP_PRIVATE_KEY) is preferred;
// a personal access token (GITHUB_TOKEN) is the deprecated fallback.
if (!env.GITHUB_APP_ID && !env.GITHUB_APP_PRIVATE_KEY && !env.GITHUB_TOKEN) {
  throw new Error(
    "GitHub API auth is not configured.\n" +
      "Set GITHUB_APP_ID + GITHUB_APP_PRIVATE_KEY (recommended) " +
      "or GITHUB_TOKEN (deprecated fallback)."
  );
}
