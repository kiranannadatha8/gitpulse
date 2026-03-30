import { describe, it, expect } from "vitest";
import { envSchema } from "../env.js";

describe("envSchema", () => {
  describe("valid environment", () => {
    it("passes validation with all required fields", () => {
      const result = envSchema.safeParse({
        DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
        OPENAI_API_KEY: "sk-test-key",
        GITHUB_TOKEN: "ghp_testtoken",
        PORT: 3001,
        FRONTEND_URL: "http://localhost:5173",
        NODE_ENV: "development",
      });
      expect(result.success).toBe(true);
    });

    it("passes with only required fields (uses defaults)", () => {
      const result = envSchema.safeParse({
        DATABASE_URL: "postgresql://localhost/testdb",
        OPENAI_API_KEY: "sk-test",
        GITHUB_TOKEN: "ghp_token",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("default values", () => {
    const baseEnv = {
      DATABASE_URL: "postgresql://localhost/testdb",
      OPENAI_API_KEY: "sk-test",
      GITHUB_TOKEN: "ghp_token",
    };

    it("defaults PORT to 3001", () => {
      const result = envSchema.safeParse(baseEnv);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.PORT).toBe(3001);
      }
    });

    it("defaults FRONTEND_URL to http://localhost:5173", () => {
      const result = envSchema.safeParse(baseEnv);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.FRONTEND_URL).toBe("http://localhost:5173");
      }
    });

    it("defaults NODE_ENV to development", () => {
      const result = envSchema.safeParse(baseEnv);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.NODE_ENV).toBe("development");
      }
    });
  });

  describe("PORT coercion", () => {
    it("coerces string PORT to number", () => {
      const result = envSchema.safeParse({
        DATABASE_URL: "postgresql://localhost/testdb",
        OPENAI_API_KEY: "sk-test",
        GITHUB_TOKEN: "ghp_token",
        PORT: "3001",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.PORT).toBe(3001);
        expect(typeof result.data.PORT).toBe("number");
      }
    });

    it("coerces a different string port to number", () => {
      const result = envSchema.safeParse({
        DATABASE_URL: "postgresql://localhost/testdb",
        OPENAI_API_KEY: "sk-test",
        GITHUB_TOKEN: "ghp_token",
        PORT: "8080",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.PORT).toBe(8080);
      }
    });
  });

  describe("missing required fields", () => {
    it("fails when DATABASE_URL is missing", () => {
      const result = envSchema.safeParse({
        OPENAI_API_KEY: "sk-test",
        GITHUB_TOKEN: "ghp_token",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const paths = result.error.errors.map((e) => e.path.join("."));
        expect(paths).toContain("DATABASE_URL");
      }
    });

    it("fails when OPENAI_API_KEY is missing", () => {
      const result = envSchema.safeParse({
        DATABASE_URL: "postgresql://localhost/testdb",
        GITHUB_TOKEN: "ghp_token",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const paths = result.error.errors.map((e) => e.path.join("."));
        expect(paths).toContain("OPENAI_API_KEY");
      }
    });

    it("fails when GITHUB_TOKEN is missing", () => {
      const result = envSchema.safeParse({
        DATABASE_URL: "postgresql://localhost/testdb",
        OPENAI_API_KEY: "sk-test",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const paths = result.error.errors.map((e) => e.path.join("."));
        expect(paths).toContain("GITHUB_TOKEN");
      }
    });

    it("provides a descriptive error message for missing DATABASE_URL", () => {
      const result = envSchema.safeParse({
        OPENAI_API_KEY: "sk-test",
        GITHUB_TOKEN: "ghp_token",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const dbError = result.error.errors.find(
          (e) => e.path.join(".") === "DATABASE_URL"
        );
        expect(dbError).toBeDefined();
        expect(dbError?.message).toBeTruthy();
      }
    });
  });

  describe("empty string required fields", () => {
    it("fails when DATABASE_URL is empty string", () => {
      const result = envSchema.safeParse({
        DATABASE_URL: "",
        OPENAI_API_KEY: "sk-test",
        GITHUB_TOKEN: "ghp_token",
      });
      expect(result.success).toBe(false);
    });

    it("fails when OPENAI_API_KEY is empty string", () => {
      const result = envSchema.safeParse({
        DATABASE_URL: "postgresql://localhost/testdb",
        OPENAI_API_KEY: "",
        GITHUB_TOKEN: "ghp_token",
      });
      expect(result.success).toBe(false);
    });

    it("fails when GITHUB_TOKEN is empty string", () => {
      const result = envSchema.safeParse({
        DATABASE_URL: "postgresql://localhost/testdb",
        OPENAI_API_KEY: "sk-test",
        GITHUB_TOKEN: "",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("NODE_ENV validation", () => {
    it("accepts development", () => {
      const result = envSchema.safeParse({
        DATABASE_URL: "postgresql://localhost/testdb",
        OPENAI_API_KEY: "sk-test",
        GITHUB_TOKEN: "ghp_token",
        NODE_ENV: "development",
      });
      expect(result.success).toBe(true);
    });

    it("accepts production", () => {
      const result = envSchema.safeParse({
        DATABASE_URL: "postgresql://localhost/testdb",
        OPENAI_API_KEY: "sk-test",
        GITHUB_TOKEN: "ghp_token",
        NODE_ENV: "production",
      });
      expect(result.success).toBe(true);
    });

    it("accepts test", () => {
      const result = envSchema.safeParse({
        DATABASE_URL: "postgresql://localhost/testdb",
        OPENAI_API_KEY: "sk-test",
        GITHUB_TOKEN: "ghp_token",
        NODE_ENV: "test",
      });
      expect(result.success).toBe(true);
    });

    it("fails with invalid NODE_ENV value", () => {
      const result = envSchema.safeParse({
        DATABASE_URL: "postgresql://localhost/testdb",
        OPENAI_API_KEY: "sk-test",
        GITHUB_TOKEN: "ghp_token",
        NODE_ENV: "staging",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const envError = result.error.errors.find(
          (e) => e.path.join(".") === "NODE_ENV"
        );
        expect(envError).toBeDefined();
      }
    });
  });
});
