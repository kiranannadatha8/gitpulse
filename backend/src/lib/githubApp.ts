import { createAppAuth } from "@octokit/auth-app";
import { Octokit } from "@octokit/rest";
import { env } from "./env.js";
import logger from "./logger.js";

/**
 * Returns an Octokit instance authenticated with the GitHub App's
 * installation token. Installation tokens are short-lived (1 hour) and
 * automatically obtained; @octokit/auth-app handles caching and renewal.
 *
 * Falls back to a PAT-authenticated Octokit if the App is not configured
 * (e.g. during local dev with only GITHUB_TOKEN set).
 */
export function createAppOctokit(): Octokit {
  if (env.GITHUB_APP_ID && env.GITHUB_APP_PRIVATE_KEY && env.GITHUB_APP_INSTALLATION_ID) {
    // Replace escaped newlines in the private key (common when set via env vars)
    const privateKey = env.GITHUB_APP_PRIVATE_KEY.replace(/\\n/g, "\n");

    return new Octokit({
      authStrategy: createAppAuth,
      auth: {
        appId: env.GITHUB_APP_ID,
        privateKey,
        installationId: env.GITHUB_APP_INSTALLATION_ID,
      },
    });
  }

  if (env.GITHUB_TOKEN) {
    logger.warn(
      "GITHUB_TOKEN (PAT) is in use. Migrate to a GitHub App for better rate limits and security."
    );
    return new Octokit({ auth: env.GITHUB_TOKEN });
  }

  // This should never be reached — env.ts guards against it at startup.
  throw new Error("No GitHub API credentials configured.");
}

/**
 * Returns an Octokit instance authenticated as a specific user via their
 * stored OAuth access token. Using per-user tokens means each user has an
 * independent 5,000 req/hr rate limit instead of sharing one.
 */
export function createUserOctokit(accessToken: string): Octokit {
  return new Octokit({ auth: accessToken });
}
