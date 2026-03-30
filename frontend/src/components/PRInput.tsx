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
    <form onSubmit={handleSubmit}>
      <label htmlFor="pr-url-input" className="sr-only">
        GitHub PR URL
      </label>

      <div className="gp-input-card">
        {/* URL input area */}
        <div style={{ padding: "20px 20px 14px" }}>
          <input
            id="pr-url-input"
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://github.com/owner/repo/pull/123"
            disabled={isLoading}
            aria-describedby={validationError !== null ? "pr-url-error" : undefined}
            className="gp-url-input"
            style={{ opacity: isLoading ? 0.5 : 1 }}
          />
        </div>

        {/* Toolbar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 12px 14px",
            borderTop: "1px solid var(--border)",
          }}
        >
          {/* Left: GitHub badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: "var(--text-muted)",
              fontSize: 12,
              padding: "4px 10px",
              border: "1px solid var(--border)",
              borderRadius: 20,
              userSelect: "none",
            }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            github.com
          </div>

          {/* Right: Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="gp-submit"
            aria-label="Analyze PR"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M12 19V5M5 12l7-7 7 7"
                stroke="white"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {validationError !== null && (
        <p
          id="pr-url-error"
          role="alert"
          style={{ marginTop: 8, fontSize: 13, color: "#dc2626" }}
        >
          {validationError}
        </p>
      )}
    </form>
  );
}
