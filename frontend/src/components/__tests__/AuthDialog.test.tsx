import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("../../hooks/useAuth");

import * as useAuthModule from "../../hooks/useAuth";
import { AuthDialog } from "../AuthDialog";

function setupAuth(overrides?: Partial<ReturnType<typeof useAuthModule.useAuth>>) {
  vi.mocked(useAuthModule.useAuth).mockReturnValue({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    ...overrides,
  });
}

describe("AuthDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuth();
  });

  it("renders a Log In button", () => {
    render(<AuthDialog />);
    expect(screen.getByRole("button", { name: /log in/i })).toBeInTheDocument();
  });

  it("opens the dialog when Log In button is clicked", async () => {
    const user = userEvent.setup();
    render(<AuthDialog />);

    await user.click(screen.getByRole("button", { name: /log in/i }));

    expect(screen.getByText(/sign in with github/i)).toBeInTheDocument();
  });

  it("shows GitPulse branding inside the dialog", async () => {
    const user = userEvent.setup();
    render(<AuthDialog />);

    await user.click(screen.getByRole("button", { name: /log in/i }));

    expect(screen.getByText("GitPulse")).toBeInTheDocument();
  });

  it("calls login() when Sign in with GitHub button is clicked", async () => {
    const mockLogin = vi.fn();
    setupAuth({ login: mockLogin });

    const user = userEvent.setup();
    render(<AuthDialog />);

    await user.click(screen.getByRole("button", { name: /log in/i }));
    await user.click(
      screen.getByRole("button", { name: /sign in with github/i })
    );

    expect(mockLogin).toHaveBeenCalledTimes(1);
  });

  it("shows the review history migration note", async () => {
    const user = userEvent.setup();
    render(<AuthDialog />);

    await user.click(screen.getByRole("button", { name: /log in/i }));

    expect(
      screen.getByText(/your existing anonymous reviews/i)
    ).toBeInTheDocument();
  });
});
