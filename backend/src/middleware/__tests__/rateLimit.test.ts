import { describe, it, expect } from "vitest";
import { reviewRateLimit, authRateLimit } from "../rateLimit.js";

describe("reviewRateLimit", () => {
  it("is a function (middleware)", () => {
    expect(typeof reviewRateLimit).toBe("function");
  });
});

describe("authRateLimit", () => {
  it("is a function (middleware)", () => {
    expect(typeof authRateLimit).toBe("function");
  });

  it("is a separate instance from reviewRateLimit", () => {
    expect(authRateLimit).not.toBe(reviewRateLimit);
  });
});
