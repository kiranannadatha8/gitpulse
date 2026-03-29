export function LoadingState(): JSX.Element {
  return (
    <div
      data-testid="loading-state"
      className="flex flex-col items-center justify-center gap-4 py-16"
    >
      <div
        role="status"
        aria-label="Loading"
        className="animate-spin h-10 w-10 rounded-full border-4 border-gray-200 border-t-blue-600"
      />
      <p className="text-gray-600 text-sm">Analyzing your PR...</p>
    </div>
  );
}
