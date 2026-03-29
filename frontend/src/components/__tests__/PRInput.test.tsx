import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { PRInput } from "../PRInput";

describe("PRInput", () => {
  const onSubmit = vi.fn();

  beforeEach(() => {
    onSubmit.mockReset();
  });

  it("renders text input and submit button", () => {
    render(<PRInput onSubmit={onSubmit} isLoading={false} />);

    expect(
      screen.getByPlaceholderText("https://github.com/owner/repo/pull/123")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /analyze pr/i })
    ).toBeInTheDocument();
  });

  it("shows validation error for an invalid URL on submit", async () => {
    const user = userEvent.setup();
    render(<PRInput onSubmit={onSubmit} isLoading={false} />);

    await user.type(screen.getByRole("textbox"), "not-a-valid-url");
    await user.click(screen.getByRole("button", { name: /analyze pr/i }));

    expect(
      screen.getByText("Please enter a valid GitHub PR URL.")
    ).toBeInTheDocument();
  });

  it("does not show validation error before submit", () => {
    render(<PRInput onSubmit={onSubmit} isLoading={false} />);

    expect(
      screen.queryByText("Please enter a valid GitHub PR URL.")
    ).not.toBeInTheDocument();
  });

  it("calls onSubmit with trimmed URL for a valid input", async () => {
    const user = userEvent.setup();
    render(<PRInput onSubmit={onSubmit} isLoading={false} />);

    const validUrl = "https://github.com/owner/repo/pull/42";
    await user.type(screen.getByRole("textbox"), `  ${validUrl}  `);
    await user.click(screen.getByRole("button", { name: /analyze pr/i }));

    expect(onSubmit).toHaveBeenCalledOnce();
    expect(onSubmit).toHaveBeenCalledWith(validUrl);
  });

  it("does not call onSubmit for an invalid URL", async () => {
    const user = userEvent.setup();
    render(<PRInput onSubmit={onSubmit} isLoading={false} />);

    await user.type(screen.getByRole("textbox"), "https://notgithub.com/foo");
    await user.click(screen.getByRole("button", { name: /analyze pr/i }));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("disables input and button when isLoading=true", () => {
    render(<PRInput onSubmit={onSubmit} isLoading={true} />);

    expect(screen.getByRole("textbox")).toBeDisabled();
    expect(screen.getByRole("button", { name: /analyze pr/i })).toBeDisabled();
  });

  it("clears the input after a valid submit", async () => {
    const user = userEvent.setup();
    render(<PRInput onSubmit={onSubmit} isLoading={false} />);

    const input = screen.getByRole("textbox");
    await user.type(input, "https://github.com/owner/repo/pull/42");
    await user.click(screen.getByRole("button", { name: /analyze pr/i }));

    await waitFor(() => expect(input).toHaveValue(""));
  });
});
