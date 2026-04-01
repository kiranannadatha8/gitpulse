import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CookieBanner } from "../CookieBanner";

const STORAGE_KEY = "gitpulse_cookie_consent";

describe("CookieBanner", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("renders when consent has not been given", () => {
    render(<CookieBanner />);
    expect(screen.getByRole("region", { name: /cookie notice/i })).toBeInTheDocument();
  });

  it("does not render when consent is already stored", () => {
    localStorage.setItem(STORAGE_KEY, "true");
    render(<CookieBanner />);
    expect(screen.queryByRole("region", { name: /cookie notice/i })).not.toBeInTheDocument();
  });

  it("hides after clicking Got it", () => {
    render(<CookieBanner />);
    fireEvent.click(screen.getByRole("button", { name: /got it/i }));
    expect(screen.queryByRole("region", { name: /cookie notice/i })).not.toBeInTheDocument();
  });

  it("persists consent to localStorage on dismiss", () => {
    render(<CookieBanner />);
    fireEvent.click(screen.getByRole("button", { name: /got it/i }));
    expect(localStorage.getItem(STORAGE_KEY)).toBe("true");
  });
});
