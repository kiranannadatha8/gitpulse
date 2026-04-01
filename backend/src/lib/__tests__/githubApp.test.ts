import { describe, it, expect, vi, beforeEach } from "vitest";

const { MockOctokit } = vi.hoisted(() => ({
  MockOctokit: vi.fn((opts: Record<string, unknown>) => ({ _opts: opts })),
}));

vi.mock("@octokit/rest", () => ({ Octokit: MockOctokit }));
vi.mock("@octokit/auth-app", () => ({
  createAppAuth: Symbol("createAppAuth"),
}));
vi.mock("../logger.js", () => ({
  default: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

// Provide App credentials so createAppOctokit uses the App path
vi.mock("../env.js", () => ({
  env: {
    GITHUB_APP_ID: 12345,
    GITHUB_APP_PRIVATE_KEY: "-----BEGIN RSA PRIVATE KEY-----\nfakekey\n-----END RSA PRIVATE KEY-----",
    GITHUB_APP_INSTALLATION_ID: 67890,
    GITHUB_TOKEN: undefined,
  },
}));

import { createAppOctokit, createUserOctokit } from "../githubApp.js";
import { createAppAuth } from "@octokit/auth-app";
import logger from "../logger.js";

describe("createUserOctokit", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates an Octokit authenticated with the provided user token", () => {
    const octokit = createUserOctokit("gho_user_token") as unknown as { _opts: Record<string, unknown> };
    expect(octokit._opts.auth).toBe("gho_user_token");
  });

  it("creates a distinct Octokit instance per call", () => {
    const a = createUserOctokit("token-a");
    const b = createUserOctokit("token-b");
    expect(a).not.toBe(b);
  });
});

describe("createAppOctokit", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates an Octokit using the GitHub App auth strategy", () => {
    createAppOctokit();

    expect(MockOctokit).toHaveBeenCalledWith(
      expect.objectContaining({ authStrategy: createAppAuth })
    );
  });

  it("includes appId, privateKey, and installationId in auth options", () => {
    createAppOctokit();

    const call = MockOctokit.mock.calls[0][0] as { auth: Record<string, unknown> };
    expect(call.auth.appId).toBe(12345);
    expect(call.auth.installationId).toBe(67890);
    expect(typeof call.auth.privateKey).toBe("string");
  });

  it("does not log a deprecation warning when App credentials are present", () => {
    createAppOctokit();
    expect(logger.warn).not.toHaveBeenCalled();
  });
});
