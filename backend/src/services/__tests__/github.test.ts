import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock @octokit/rest before importing the module under test
vi.mock("@octokit/rest", () => {
  const mockGet = vi.fn();
  const mockListFiles = vi.fn();
  const MockOctokit = vi.fn(() => ({
    rest: {
      pulls: {
        get: mockGet,
        listFiles: mockListFiles,
      },
    },
  }));
  return { Octokit: MockOctokit };
});

// Mock env so the module can load
vi.mock("../../lib/env.js", () => ({
  env: {
    GITHUB_TOKEN: "test-token",
    ANTHROPIC_API_KEY: "test-key",
    DATABASE_URL: "postgresql://localhost/test",
    PORT: 3001,
    FRONTEND_URL: "http://localhost:5173",
    NODE_ENV: "test",
  },
}));

import { Octokit } from "@octokit/rest";
import {
  fetchPRDiff,
  GitHubNotFoundError,
  GitHubAuthError,
  GitHubRateLimitError,
} from "../github.js";

const MockOctokit = Octokit as unknown as ReturnType<typeof vi.fn>;

function getOctokitInstance() {
  return MockOctokit.mock.results[MockOctokit.mock.results.length - 1]?.value as {
    rest: {
      pulls: {
        get: ReturnType<typeof vi.fn>;
        listFiles: ReturnType<typeof vi.fn>;
      };
    };
  };
}

describe("fetchPRDiff", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns title and files on successful fetch", async () => {
    // Need to instantiate first so we can access mock methods
    MockOctokit.mockImplementationOnce(() => ({
      rest: {
        pulls: {
          get: vi.fn().mockResolvedValue({
            data: { title: "Fix awesome bug" },
          }),
          listFiles: vi.fn().mockResolvedValue({
            data: [
              { filename: "src/index.ts", status: "modified", patch: "- old\n+ new" },
              { filename: "README.md", status: "modified", patch: "# Updated" },
            ],
          }),
        },
      },
    }));

    const result = await fetchPRDiff("owner", "repo", 42);

    expect(result.title).toBe("Fix awesome bug");
    expect(result.files).toHaveLength(2);
    expect(result.files[0]).toEqual({
      filename: "src/index.ts",
      status: "modified",
      patch: "- old\n+ new",
    });
  });

  it("includes files with undefined patch (binary or new files)", async () => {
    MockOctokit.mockImplementationOnce(() => ({
      rest: {
        pulls: {
          get: vi.fn().mockResolvedValue({
            data: { title: "Add binary asset" },
          }),
          listFiles: vi.fn().mockResolvedValue({
            data: [
              { filename: "assets/image.png", status: "added", patch: undefined },
            ],
          }),
        },
      },
    }));

    const result = await fetchPRDiff("owner", "repo", 10);
    expect(result.files[0].patch).toBeUndefined();
  });

  it("throws GitHubNotFoundError on 404", async () => {
    const notFoundError = Object.assign(new Error("Not Found"), { status: 404 });
    MockOctokit.mockImplementationOnce(() => ({
      rest: {
        pulls: {
          get: vi.fn().mockRejectedValue(notFoundError),
          listFiles: vi.fn(),
        },
      },
    }));

    await expect(fetchPRDiff("owner", "repo", 999)).rejects.toThrow(
      GitHubNotFoundError
    );
  });

  it("throws GitHubAuthError on 401", async () => {
    const authError = Object.assign(new Error("Unauthorized"), { status: 401 });
    MockOctokit.mockImplementationOnce(() => ({
      rest: {
        pulls: {
          get: vi.fn().mockRejectedValue(authError),
          listFiles: vi.fn(),
        },
      },
    }));

    await expect(fetchPRDiff("owner", "repo", 42)).rejects.toThrow(
      GitHubAuthError
    );
  });

  it("throws GitHubRateLimitError on 403 with rate limit message", async () => {
    const rateLimitError = Object.assign(
      new Error("API rate limit exceeded"),
      { status: 403 }
    );
    MockOctokit.mockImplementationOnce(() => ({
      rest: {
        pulls: {
          get: vi.fn().mockRejectedValue(rateLimitError),
          listFiles: vi.fn(),
        },
      },
    }));

    await expect(fetchPRDiff("owner", "repo", 42)).rejects.toThrow(
      GitHubRateLimitError
    );
  });

  it("truncates total diff to 100KB max", async () => {
    const bigPatch = "x".repeat(60_000);
    const bigPatch2 = "y".repeat(60_000);

    MockOctokit.mockImplementationOnce(() => ({
      rest: {
        pulls: {
          get: vi.fn().mockResolvedValue({
            data: { title: "Big diff PR" },
          }),
          listFiles: vi.fn().mockResolvedValue({
            data: [
              { filename: "file1.ts", status: "modified", patch: bigPatch },
              { filename: "file2.ts", status: "modified", patch: bigPatch2 },
            ],
          }),
        },
      },
    }));

    const result = await fetchPRDiff("owner", "repo", 42);

    const totalPatchLength = result.files.reduce(
      (sum, f) => sum + (f.patch?.length ?? 0),
      0
    );
    expect(totalPatchLength).toBeLessThanOrEqual(100_000);
  });

  it("typed errors extend Error", () => {
    expect(new GitHubNotFoundError("msg")).toBeInstanceOf(Error);
    expect(new GitHubAuthError("msg")).toBeInstanceOf(Error);
    expect(new GitHubRateLimitError("msg")).toBeInstanceOf(Error);

    expect(new GitHubNotFoundError("msg").name).toBe("GitHubNotFoundError");
    expect(new GitHubAuthError("msg").name).toBe("GitHubAuthError");
    expect(new GitHubRateLimitError("msg").name).toBe("GitHubRateLimitError");
  });
});
