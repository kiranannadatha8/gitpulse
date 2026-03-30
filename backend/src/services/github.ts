import { Octokit } from "@octokit/rest";
import { env } from "../lib/env.js";
import logger from "../lib/logger.js";

export class GitHubNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GitHubNotFoundError";
    Object.setPrototypeOf(this, GitHubNotFoundError.prototype);
  }
}

export class GitHubAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GitHubAuthError";
    Object.setPrototypeOf(this, GitHubAuthError.prototype);
  }
}

export class GitHubRateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GitHubRateLimitError";
    Object.setPrototypeOf(this, GitHubRateLimitError.prototype);
  }
}

export interface PRDiff {
  title: string;
  files: Array<{ filename: string; status: string; patch: string | undefined }>;
}

// Singleton — reuses connection pool across requests
const octokit = new Octokit({ auth: env.GITHUB_TOKEN });

// Named MAX_DIFF_CHARS — measures JS string length (UTF-16 code units), not bytes
const MAX_DIFF_CHARS = 100_000;

function truncateDiff(
  files: Array<{ filename: string; status: string; patch: string | undefined }>
): Array<{ filename: string; status: string; patch: string | undefined }> {
  let charsUsed = 0;
  return files.map((file) => {
    if (!file.patch) return file;

    const remaining = MAX_DIFF_CHARS - charsUsed;
    if (remaining <= 0) {
      return { ...file, patch: undefined };
    }

    if (file.patch.length > remaining) {
      charsUsed += remaining;
      return { ...file, patch: file.patch.slice(0, remaining) };
    }

    charsUsed += file.patch.length;
    return file;
  });
}

function mapOctokitError(error: unknown): never {
  const err = error as { status?: number; message?: string };
  const status = err.status;
  const message = err.message ?? "Unknown GitHub API error";

  if (status === 404) {
    throw new GitHubNotFoundError(`PR not found: ${message}`);
  }

  if (status === 401) {
    throw new GitHubAuthError(`GitHub authentication failed: ${message}`);
  }

  if (status === 403) {
    throw new GitHubRateLimitError(`GitHub rate limit exceeded: ${message}`);
  }

  throw new Error(`GitHub API error (${status ?? "unknown"}): ${message}`);
}

export async function fetchPRDiff(
  owner: string,
  repo: string,
  prNumber: number
): Promise<PRDiff> {
  logger.info({ owner, repo, prNumber }, "Fetching PR diff from GitHub");

  let title: string;
  let rawFiles: Array<{ filename: string; status: string; patch?: string }>;

  try {
    const { data } = await octokit.rest.pulls.get({ owner, repo, pull_number: prNumber });
    title = data.title;
  } catch (error) {
    mapOctokitError(error);
  }

  try {
    const { data } = await octokit.rest.pulls.listFiles({
      owner,
      repo,
      pull_number: prNumber,
    });
    rawFiles = data;
  } catch (error) {
    mapOctokitError(error);
  }

  const files = truncateDiff(
    rawFiles!.map((f) => ({
      filename: f.filename,
      status: f.status,
      patch: f.patch,
    }))
  );

  logger.info({ owner, repo, prNumber, fileCount: files.length }, "PR diff fetched");

  return { title: title!, files };
}
