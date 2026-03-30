export function LoadingState(): JSX.Element {
  return (
    <div
      data-testid="loading-state"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16,
        padding: "48px 0",
        fontFamily: "var(--font-ui)",
      }}
    >
      {/* Spinner — animate-spin and role=status required by tests */}
      <div
        role="status"
        aria-label="Loading"
        className="animate-spin"
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          border: "2px solid var(--border)",
          borderTopColor: "var(--btn-bg)",
        }}
      />
      {/* Exact text required by test */}
      <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
        Analyzing your PR...
      </p>
    </div>
  );
}
