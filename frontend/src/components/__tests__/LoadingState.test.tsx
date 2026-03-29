import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { LoadingState } from "../LoadingState";

describe("LoadingState", () => {
  it("renders loading text", () => {
    render(<LoadingState />);
    expect(screen.getByText("Analyzing your PR...")).toBeInTheDocument();
  });

  it("renders a container with data-testid loading-state", () => {
    render(<LoadingState />);
    expect(screen.getByTestId("loading-state")).toBeInTheDocument();
  });

  it("renders a spinner with role=status", () => {
    render(<LoadingState />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("spinner has animate-spin class", () => {
    render(<LoadingState />);
    expect(screen.getByRole("status")).toHaveClass("animate-spin");
  });
});
