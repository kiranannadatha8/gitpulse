export function LoadingState(): JSX.Element {
  return (
    <div
      data-testid="loading-state"
      className="flex flex-col items-center gap-4 py-12"
      style={{ fontFamily: "var(--font-ui)" }}
    >
      {/* animate-spin + role=status required by tests */}
      <div
        role="status"
        aria-label="Loading"
        className="animate-spin h-7 w-7 rounded-full border-2 border-border border-t-primary"
      />
      {/* Exact text required by tests */}
      <p className="text-[13px] text-muted-foreground">Analyzing your PR...</p>
    </div>
  );
}
