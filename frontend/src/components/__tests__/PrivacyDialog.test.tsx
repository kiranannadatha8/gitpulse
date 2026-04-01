import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PrivacyDialog } from "../PrivacyDialog";

describe("PrivacyDialog", () => {
  it("renders the trigger element", () => {
    render(<PrivacyDialog trigger={<button>Privacy</button>} />);
    expect(screen.getByRole("button", { name: /privacy/i })).toBeInTheDocument();
  });

  it("opens the dialog when trigger is clicked", () => {
    render(<PrivacyDialog trigger={<button>Privacy</button>} />);
    fireEvent.click(screen.getByRole("button", { name: /privacy/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /privacy policy/i })).toBeInTheDocument();
  });

  it("shows what data is collected", () => {
    render(<PrivacyDialog trigger={<button>Privacy</button>} />);
    fireEvent.click(screen.getByRole("button", { name: /privacy/i }));
    expect(screen.getByText(/what we collect/i)).toBeInTheDocument();
  });

  it("mentions data export and deletion rights", () => {
    render(<PrivacyDialog trigger={<button>Privacy</button>} />);
    fireEvent.click(screen.getByRole("button", { name: /privacy/i }));
    expect(screen.getByText(/your rights/i)).toBeInTheDocument();
    expect(screen.getByText(/export all data/i)).toBeInTheDocument();
  });
});
