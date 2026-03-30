import React from "react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(_error: Error, _info: React.ErrorInfo): void {
    // Errors are already captured in state via getDerivedStateFromError.
    // Wire up error reporting (e.g. Sentry) here in future.
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      const isDev = import.meta.env.DEV;
      return (
        <div data-testid="error-boundary-fallback">
          <h2>Something went wrong.</h2>
          <p>
            {isDev
              ? this.state.error?.message
              : "An unexpected error occurred. Please refresh the page."}
          </p>
          <button type="button" onClick={this.handleReset}>
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
