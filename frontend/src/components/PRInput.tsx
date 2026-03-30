import { useState } from "react";
import { FaGithub } from "react-icons/fa";
import { LuArrowUp } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

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
        <div className="px-5 pt-5 pb-3">
          <Input
            id="pr-url-input"
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://github.com/owner/repo/pull/123"
            disabled={isLoading}
            aria-describedby={validationError !== null ? "pr-url-error" : undefined}
            className={cn("text-[15px]", isLoading && "opacity-50")}
          />
        </div>

        {/* Toolbar */}
        <div
          className="flex items-center justify-between px-3 pb-3 pt-2"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          {/* GitHub badge pill */}
          <div
            className="flex items-center gap-1.5 text-muted-foreground text-xs px-2.5 py-1 rounded-full border border-border select-none"
          >
            <FaGithub size={13} aria-hidden="true" />
            github.com
          </div>

          {/* Submit button — aria-label must match /analyze pr/i for tests */}
          <Button
            type="submit"
            size="icon"
            disabled={isLoading}
            aria-label="Analyze PR"
            className="rounded-full w-9 h-9 transition-transform hover:scale-105 active:scale-95"
          >
            <LuArrowUp size={15} aria-hidden="true" />
          </Button>
        </div>
      </div>

      {validationError !== null && (
        <p
          id="pr-url-error"
          role="alert"
          className="mt-2 text-[13px] text-destructive"
        >
          {validationError}
        </p>
      )}
    </form>
  );
}
