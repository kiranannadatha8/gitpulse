import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import React, { useState } from "react";
import { ErrorBoundary } from "../ErrorBoundary";

// Helper: renders normally (no throw)
function NormalChild() {
  return <div data-testid="normal-child">All good</div>;
}

// Helper: conditionally throws based on prop
interface ThrowingComponentProps {
  shouldThrow: boolean;
}

function ThrowingComponent({ shouldThrow }: ThrowingComponentProps) {
  if (shouldThrow) {
    throw new Error("Test error message");
  }
  return <div data-testid="recovered-child">Recovered</div>;
}

// Wrapper that lets us toggle shouldThrow from outside
function ToggleWrapper() {
  const [shouldThrow, setShouldThrow] = useState(true);
  return (
    <ErrorBoundary>
      <ThrowingComponent shouldThrow={shouldThrow} />
      <button onClick={() => setShouldThrow(false)}>Fix child</button>
    </ErrorBoundary>
  );
}

describe("ErrorBoundary", () => {
  it("renders children normally when no error occurs", () => {
    render(
      <ErrorBoundary>
        <NormalChild />
      </ErrorBoundary>
    );
    expect(screen.getByTestId("normal-child")).toBeInTheDocument();
    expect(screen.getByText("All good")).toBeInTheDocument();
  });

  it("shows fallback UI when a child throws", () => {
    // Suppress console.error noise from React during error boundary tests
    const consoleError = console.error;
    console.error = () => {};

    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByTestId("error-boundary-fallback")).toBeInTheDocument();
    expect(screen.getByText("Something went wrong.")).toBeInTheDocument();

    console.error = consoleError;
  });

  it("shows the error message in the fallback UI", () => {
    const consoleError = console.error;
    console.error = () => {};

    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText("Test error message")).toBeInTheDocument();

    console.error = consoleError;
  });

  it("renders a Try again button in the fallback UI", () => {
    const consoleError = console.error;
    console.error = () => {};

    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(
      screen.getByRole("button", { name: "Try again" })
    ).toBeInTheDocument();

    console.error = consoleError;
  });

  it("Try again button resets error state and shows children", async () => {
    const consoleError = console.error;
    console.error = () => {};

    const user = userEvent.setup();

    // Use a wrapper where the child stops throwing after reset
    function ResettableWrapper() {
      const [shouldThrow, setShouldThrow] = useState(true);
      return (
        <ErrorBoundary>
          {shouldThrow ? (
            <ThrowingComponent shouldThrow={true} />
          ) : (
            <div data-testid="recovered-child">Recovered</div>
          )}
          {!shouldThrow ? null : (
            // We need to trigger the fix from outside the boundary reset
            // The boundary's "Try again" button resets boundary state;
            // we also need the child to stop throwing.
            // Strategy: the ThrowingComponent won't throw after boundary resets
            // if we control it at the parent level.
            // For this test, after clicking "Try again", the boundary re-renders
            // children. We want the children to not throw. We'll use a stateful wrapper.
            <></>
          )}
        </ErrorBoundary>
      );
    }

    // Simpler approach: wrap boundary around a component that stops throwing
    // when boundary resets (key trick)
    function SimpleResettable() {
      const [key, setKey] = useState(0);
      const [shouldThrow, setShouldThrow] = useState(true);

      return (
        <div>
          <button
            data-testid="stop-throwing"
            onClick={() => setShouldThrow(false)}
          >
            Stop
          </button>
          <ErrorBoundary key={key}>
            <ThrowingComponent shouldThrow={shouldThrow} />
          </ErrorBoundary>
        </div>
      );
    }

    // Clean test: boundary catches error, "Try again" resets state
    // After reset, child is re-rendered — if child no longer throws, it shows.
    // We test this by: child throws → fallback shown → click Try again
    // → boundary resets → child is re-rendered with shouldThrow=false (managed by parent state)

    function ControlledResettable() {
      const [shouldThrow, setShouldThrow] = useState(true);
      return (
        <div>
          <button
            data-testid="fix-child"
            onClick={() => setShouldThrow(false)}
          >
            Fix
          </button>
          <ErrorBoundary>
            <ThrowingComponent shouldThrow={shouldThrow} />
          </ErrorBoundary>
        </div>
      );
    }

    render(<ControlledResettable />);

    // Fallback is shown
    expect(screen.getByTestId("error-boundary-fallback")).toBeInTheDocument();

    // Fix the child so it won't throw
    await user.click(screen.getByTestId("fix-child"));

    // Click Try again — resets the boundary state
    await user.click(screen.getByRole("button", { name: "Try again" }));

    // Children are rendered again (no error)
    expect(screen.getByTestId("recovered-child")).toBeInTheDocument();
    expect(
      screen.queryByTestId("error-boundary-fallback")
    ).not.toBeInTheDocument();

    console.error = consoleError;
  });
});
