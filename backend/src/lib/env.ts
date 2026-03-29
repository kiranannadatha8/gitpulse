import { z } from "zod";
import "dotenv/config";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  ANTHROPIC_API_KEY: z.string().min(1, "ANTHROPIC_API_KEY is required"),
  GITHUB_TOKEN: z.string().min(1, "GITHUB_TOKEN is required"),
  PORT: z.coerce.number().default(3001),
  FRONTEND_URL: z.string().url().default("http://localhost:5173"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const missing = parsed.error.errors.map((e) => `  ${e.path.join(".")}: ${e.message}`).join("\n");
  throw new Error(`Missing or invalid environment variables:\n${missing}`);
}

export const env = parsed.data;
