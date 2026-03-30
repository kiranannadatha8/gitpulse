import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.hoisted runs during the hoist phase, before const declarations —
// this lets the vi.mock factory reference these functions safely.
const { mockGet, mockListFiles } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockListFiles: vi.fn(),
}));

// Mock @octokit/rest before importing the module under test.
// The singleton is constructed at module load time using this mock.
vi.mock("@octokit/rest", () => ({
  Octokit: vi.fn(() => ({
    rest: {
      pulls: {
        get: mockGet,
        listFiles: mockListFiles,
      },
    },
  })),
}));

vi.mock("../../lib/env.js", () => ({
  env: {
    GITHUB_TOKEN: "test-token",
    OPENAI_API_KEY: "test-key",
    DATABASE_URL: "postgresql://localhost/test",
    PORT: 3001,
    FRONTEND_URL: "http://localhost:5173",
    NODE_ENV: "test",
  },
}));

import {
  fetchPRDiff,
  GitHubNotFoundError,
  GitHubAuthError,
  GitHubRateLimitError,
} from "../github.js";

describe("fetchPRDiff", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns title and files on successful fetch", async () => {
    mockGet.mockResolvedValue({ data: { title: "Fix awesome bug" } });
    mockListFiles.mockResolvedValue({
      data: [
        { filename: "src/index.ts", status: "modified", patch: "- old\n+ new" },
        { filename: "README.md", status: "modified", patch: "# Updated" },
      ],
    });

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
    mockGet.mockResolvedValue({ data: { title: "Add binary asset" } });
    mockListFiles.mockResolvedValue({
      data: [{ filename: "assets/image.png", status: "added", patch: undefined }],
    });

    const result = await fetchPRDiff("owner", "repo", 10);
    expect(result.files[0].patch).toBeUndefined();
  });

  it("throws GitHubNotFoundError on 404", async () => {
    const notFoundError = Object.assign(new Error("Not Found"), { status: 404 });
    mockGet.mockRejectedValue(notFoundError);

    await expect(fetchPRDiff("owner", "repo", 999)).rejects.toThrow(
      GitHubNotFoundError
    );
  });

  it("throws GitHubAuthError on 401", async () => {
    const authError = Object.assign(new Error("Unauthorized"), { status: 401 });
    mockGet.mockRejectedValue(authError);

    await expect(fetchPRDiff("owner", "repo", 42)).rejects.toThrow(
      GitHubAuthError
    );
  });

  it("throws GitHubRateLimitError on 403", async () => {
    const rateLimitError = Object.assign(
      new Error("API rate limit exceeded"),
      { status: 403 }
    );
    mockGet.mockRejectedValue(rateLimitError);

    await expect(fetchPRDiff("owner", "repo", 42)).rejects.toThrow(
      GitHubRateLimitError
    );
  });

  it("truncates total diff to 100K chars max", async () => {
    mockGet.mockResolvedValue({ data: { title: "Big diff PR" } });
    mockListFiles.mockResolvedValue({
      data: [
        { filename: "file1.ts", status: "modified", patch: "x".repeat(60_000) },
        { filename: "file2.ts", status: "modified", patch: "y".repeat(60_000) },
      ],
    });

    const result = await fetchPRDiff("owner", "repo", 42);
    const total = result.files.reduce((sum, f) => sum + (f.patch?.length ?? 0), 0);
    expect(total).toBeLessThanOrEqual(100_000);
  });

  it("typed errors extend Error with correct names", () => {
    expect(new GitHubNotFoundError("msg")).toBeInstanceOf(Error);
    expect(new GitHubAuthError("msg")).toBeInstanceOf(Error);
    expect(new GitHubRateLimitError("msg")).toBeInstanceOf(Error);
    expect(new GitHubNotFoundError("msg").name).toBe("GitHubNotFoundError");
    expect(new GitHubAuthError("msg").name).toBe("GitHubAuthError");
    expect(new GitHubRateLimitError("msg").name).toBe("GitHubRateLimitError");
  });
});
