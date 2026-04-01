import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("../../hooks/useAuth");

import * as useAuthModule from "../../hooks/useAuth";
import { UserMenu } from "../UserMenu";

const MOCK_USER = {
  id: "user-uuid-123",
  username: "testuser",
  displayName: "Test User",
  email: "test@example.com",
  avatarUrl: null,
};

function setupAuth(overrides?: Partial<ReturnType<typeof useAuthModule.useAuth>>) {
  vi.mocked(useAuthModule.useAuth).mockReturnValue({
    user: MOCK_USER,
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    ...overrides,
  });
}

describe("UserMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuth();
  });

  it("renders a button with accessible aria-label containing the display name", () => {
    render(<UserMenu />);
    expect(
      screen.getByRole("button", { name: /user menu for test user/i })
    ).toBeInTheDocument();
  });

  it("shows display name in the dropdown when opened", async () => {
    const user = userEvent.setup();
    render(<UserMenu />);

    await user.click(
      screen.getByRole("button", { name: /user menu for test user/i })
    );

    expect(screen.getByText("Test User")).toBeInTheDocument();
  });

  it("shows @username in the dropdown", async () => {
    const user = userEvent.setup();
    render(<UserMenu />);

    await user.click(
      screen.getByRole("button", { name: /user menu for test user/i })
    );

    expect(screen.getByText("@testuser")).toBeInTheDocument();
  });

  it("shows a Log out option in the dropdown", async () => {
    const user = userEvent.setup();
    render(<UserMenu />);

    await user.click(
      screen.getByRole("button", { name: /user menu for test user/i })
    );

    expect(screen.getByText(/log out/i)).toBeInTheDocument();
  });

  it("calls logout() when Log out is clicked", async () => {
    const mockLogout = vi.fn().mockResolvedValue(undefined);
    setupAuth({ logout: mockLogout });

    const user = userEvent.setup();
    render(<UserMenu />);

    await user.click(
      screen.getByRole("button", { name: /user menu for test user/i })
    );
    await user.click(screen.getByText(/log out/i));

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it("falls back to username as display name when displayName is null", () => {
    setupAuth({ user: { ...MOCK_USER, displayName: null } });
    render(<UserMenu />);

    expect(
      screen.getByRole("button", { name: /user menu for testuser/i })
    ).toBeInTheDocument();
  });

  it("uses initials from displayName for the avatar fallback", () => {
    render(<UserMenu />);
    // Avatar fallback text = "TU" (from "Test User")
    expect(screen.getByText("TU")).toBeInTheDocument();
  });
});
