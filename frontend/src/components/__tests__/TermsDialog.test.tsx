import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TermsDialog } from "../TermsDialog";

describe("TermsDialog", () => {
  it("renders the trigger element", () => {
    render(<TermsDialog trigger={<button>Terms</button>} />);
    expect(screen.getByRole("button", { name: /terms/i })).toBeInTheDocument();
  });

  it("opens the dialog when trigger is clicked", () => {
    render(<TermsDialog trigger={<button>Terms</button>} />);
    fireEvent.click(screen.getByRole("button", { name: /terms/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /terms of service/i })).toBeInTheDocument();
  });

  it("includes no warranties section", () => {
    render(<TermsDialog trigger={<button>Terms</button>} />);
    fireEvent.click(screen.getByRole("button", { name: /terms/i }));
    expect(screen.getByText(/no warranties/i)).toBeInTheDocument();
  });
});
