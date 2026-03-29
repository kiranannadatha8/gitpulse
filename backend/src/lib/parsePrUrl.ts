import { z } from "zod";

export class InvalidPRUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidPRUrlError";
    Object.setPrototypeOf(this, InvalidPRUrlError.prototype);
  }
}

const ParsedPRSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  prNumber: z.number().int().positive(),
});

export type ParsedPR = z.infer<typeof ParsedPRSchema>;

const PR_PATH_REGEX = /^\/([^/]+)\/([^/]+)\/pull\/(\d+)\/?$/;

export function parsePRUrl(url: string): ParsedPR {
  if (!url || typeof url !== "string") {
    throw new InvalidPRUrlError("PR URL must be a non-empty string");
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new InvalidPRUrlError(`Invalid URL format: "${url}"`);
  }

  if (parsed.hostname !== "github.com") {
    throw new InvalidPRUrlError(
      `URL must be a GitHub URL (github.com), got: "${parsed.hostname}"`
    );
  }

  const match = PR_PATH_REGEX.exec(parsed.pathname);
  if (!match) {
    throw new InvalidPRUrlError(
      `URL path must match /owner/repo/pull/{number}, got: "${parsed.pathname}"`
    );
  }

  const [, owner, repo, prNumberStr] = match;
  const prNumber = parseInt(prNumberStr, 10);

  const result = ParsedPRSchema.safeParse({ owner, repo, prNumber });
  if (!result.success) {
    throw new InvalidPRUrlError(
      `Invalid PR URL components: ${result.error.message}`
    );
  }

  return result.data;
}
