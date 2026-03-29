import { describe, it, expect } from "vitest";
import { parsePRUrl, InvalidPRUrlError } from "../parsePrUrl.js";

describe("parsePRUrl", () => {
  describe("valid URLs", () => {
    it("parses a clean valid PR URL", () => {
      const result = parsePRUrl("https://github.com/owner/repo/pull/42");
      expect(result).toEqual({ owner: "owner", repo: "repo", prNumber: 42 });
    });

    it("parses URL with trailing slash", () => {
      const result = parsePRUrl("https://github.com/owner/repo/pull/42/");
      expect(result).toEqual({ owner: "owner", repo: "repo", prNumber: 42 });
    });

    it("parses URL with query parameters", () => {
      const result = parsePRUrl(
        "https://github.com/owner/repo/pull/42?foo=bar&baz=qux"
      );
      expect(result).toEqual({ owner: "owner", repo: "repo", prNumber: 42 });
    });

    it("parses URL with fragment", () => {
      const result = parsePRUrl(
        "https://github.com/owner/repo/pull/42#issuecomment-123"
      );
      expect(result).toEqual({ owner: "owner", repo: "repo", prNumber: 42 });
    });

    it("parses URL with both query params and trailing slash", () => {
      const result = parsePRUrl(
        "https://github.com/owner/repo/pull/42/?tab=commits"
      );
      expect(result).toEqual({ owner: "owner", repo: "repo", prNumber: 42 });
    });

    it("parses URL with hyphenated owner and repo", () => {
      const result = parsePRUrl(
        "https://github.com/my-org/my-repo/pull/100"
      );
      expect(result).toEqual({
        owner: "my-org",
        repo: "my-repo",
        prNumber: 100,
      });
    });

    it("parses large PR number", () => {
      const result = parsePRUrl("https://github.com/owner/repo/pull/99999");
      expect(result).toEqual({ owner: "owner", repo: "repo", prNumber: 99999 });
    });
  });

  describe("invalid URLs — throws InvalidPRUrlError", () => {
    it("throws on empty string", () => {
      expect(() => parsePRUrl("")).toThrow(InvalidPRUrlError);
    });

    it("throws on non-GitHub domain", () => {
      expect(() =>
        parsePRUrl("https://gitlab.com/owner/repo/pull/42")
      ).toThrow(InvalidPRUrlError);
    });

    it("throws on missing PR number", () => {
      expect(() =>
        parsePRUrl("https://github.com/owner/repo/pull/")
      ).toThrow(InvalidPRUrlError);
    });

    it("throws on non-numeric PR number", () => {
      expect(() =>
        parsePRUrl("https://github.com/owner/repo/pull/abc")
      ).toThrow(InvalidPRUrlError);
    });

    it("throws on issues URL (not a pull)", () => {
      expect(() =>
        parsePRUrl("https://github.com/owner/repo/issues/42")
      ).toThrow(InvalidPRUrlError);
    });

    it("throws on missing repo segment", () => {
      expect(() =>
        parsePRUrl("https://github.com/owner/pull/42")
      ).toThrow(InvalidPRUrlError);
    });

    it("throws on plain GitHub URL", () => {
      expect(() => parsePRUrl("https://github.com")).toThrow(InvalidPRUrlError);
    });

    it("throws on PR number zero", () => {
      expect(() =>
        parsePRUrl("https://github.com/owner/repo/pull/0")
      ).toThrow(InvalidPRUrlError);
    });

    it("throws on negative PR number", () => {
      expect(() =>
        parsePRUrl("https://github.com/owner/repo/pull/-5")
      ).toThrow(InvalidPRUrlError);
    });

    it("throws on completely malformed string", () => {
      expect(() => parsePRUrl("not-a-url")).toThrow(InvalidPRUrlError);
    });

    it("error message contains useful information", () => {
      let caught: unknown;
      try {
        parsePRUrl("https://gitlab.com/owner/repo/pull/42");
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeInstanceOf(InvalidPRUrlError);
      expect((caught as InvalidPRUrlError).message).toBeTruthy();
    });

    it("InvalidPRUrlError extends Error", () => {
      const err = new InvalidPRUrlError("test message");
      expect(err).toBeInstanceOf(Error);
      expect(err.name).toBe("InvalidPRUrlError");
    });
  });
});
