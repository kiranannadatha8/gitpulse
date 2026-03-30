import { useState } from "react";

const PR_URL_PATTERN = /^https:\/\/github\.com\/[^/]+\/[^/]+\/pull\/\d+/;

interface PRInputProps {
  onSubmit: (prUrl: string) => void;
  isLoading: boolean;
}

export function PRInput({ onSubmit, isLoading }: PRInputProps): JSX.Element {
  const [url, setUrl] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = url.trim();

    if (!PR_URL_PATTERN.test(trimmed)) {
      setValidationError("Please enter a valid GitHub PR URL.");
      return;
    }

    setValidationError(null);
    setUrl("");
    onSubmit(trimmed);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <label htmlFor="pr-url-input" className="sr-only">
        GitHub PR URL
      </label>
      <div className="flex gap-2">
        <input
          id="pr-url-input"
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://github.com/owner/repo/pull/123"
          disabled={isLoading}
          aria-describedby={validationError !== null ? "pr-url-error" : undefined}
          className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Analyze PR
        </button>
      </div>
      {validationError !== null && (
        <p id="pr-url-error" role="alert" className="text-sm text-red-600">
          {validationError}
        </p>
      )}
    </form>
  );
}
