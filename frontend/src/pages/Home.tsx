import { useState, useEffect } from "react";
import { useReview } from "../hooks/useReview";
import { useHistory } from "../hooks/useHistory";
import { PRInput } from "../components/PRInput";
import { LoadingState } from "../components/LoadingState";
import { ReviewCard } from "../components/ReviewCard";
import { HistorySidebar } from "../components/HistorySidebar";
import type { Review } from "../types/review";

const EXAMPLE_PRS = [
  {
    label: "facebook/react/pull/28818",
    url: "https://github.com/facebook/react/pull/28818",
  },
  {
    label: "vercel/next.js/pull/67234",
    url: "https://github.com/vercel/next.js/pull/67234",
  },
  {
    label: "tailwindlabs/tailwindcss/pull/14562",
    url: "https://github.com/tailwindlabs/tailwindcss/pull/14562",
  },
];

export function Home(): JSX.Element {
  const { submitReview, isPending, isError, error, review } = useReview();
  const { reviews, isLoading: isHistoryLoading, isError: isHistoryError } = useHistory();

  const [activeReview, setActiveReview] = useState<Review | null>(null);

  useEffect(() => {
    if (review !== null) {
      setActiveReview(review);
    }
  }, [review]);

  function handleHistorySelect(selected: Review) {
    setActiveReview(selected);
  }

  const showIdle = !isPending && activeReview === null;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        fontFamily: "var(--font-ui)",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflowX: "hidden",
      }}
    >
      {/* ── Ambient glow ── */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          justifyContent: "center",
          pointerEvents: "none",
          overflow: "hidden",
        }}
      >
        <div className="gp-glow" />
      </div>

      {/* ── Header ── */}
      <header
        style={{
          position: "relative",
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 24px",
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 28,
              height: 28,
              background: "var(--btn-bg)",
              borderRadius: 7,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M2.5 4h11M2.5 8h7.5M2.5 12h5"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 17,
              fontWeight: 500,
              color: "var(--text-primary)",
              letterSpacing: "-0.01em",
            }}
          >
            GitPulse
          </span>
        </div>

        {/* GitHub link */}
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: 13,
            color: "var(--text-muted)",
            border: "1px solid var(--border)",
            borderRadius: 20,
            padding: "5px 14px",
            background: "white",
            textDecoration: "none",
            transition: "all 0.15s",
          }}
        >
          GitHub
        </a>
      </header>

      {/* ── Main ── */}
      <main
        style={{
          position: "relative",
          zIndex: 10,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "48px 16px 80px",
        }}
      >
        <div style={{ width: "100%", maxWidth: 660 }}>

          {/* Heading */}
          <div className="gp-fade gp-delay-1" style={{ textAlign: "center", marginBottom: 36 }}>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(28px, 5vw, 44px)",
                fontWeight: 400,
                color: "var(--text-primary)",
                lineHeight: 1.18,
                letterSpacing: "-0.025em",
                margin: 0,
              }}
            >
              Review any pull request.
            </h1>
            <p
              style={{
                marginTop: 12,
                fontSize: 15,
                color: "var(--text-muted)",
                fontWeight: 300,
                lineHeight: 1.5,
              }}
            >
              Paste a GitHub PR URL to get an instant AI-powered code review.
            </p>
          </div>

          {/* Input card */}
          <div className="gp-fade gp-delay-2">
            <PRInput onSubmit={submitReview} isLoading={isPending} />
          </div>

          {/* Error alert */}
          {isError && (
            <div
              role="alert"
              className="gp-fade"
              style={{
                marginTop: 12,
                padding: "12px 16px",
                background: "#fff5f5",
                border: "1px solid #fecaca",
                borderRadius: 12,
                fontSize: 13,
                color: "#dc2626",
                fontFamily: "var(--font-ui)",
              }}
            >
              {error?.message ?? "Something went wrong. Please try again."}
            </div>
          )}

          {/* Loading */}
          {isPending && (
            <div className="gp-fade" style={{ marginTop: 24 }}>
              <LoadingState />
            </div>
          )}

          {/* Review result */}
          {!isPending && activeReview !== null && (
            <div className="gp-fade" style={{ marginTop: 24 }}>
              <ReviewCard review={activeReview} />
            </div>
          )}

          {/* Idle state: example chips + placeholder */}
          {showIdle && (
            <div className="gp-fade gp-delay-3" style={{ marginTop: 28 }}>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  letterSpacing: "0.09em",
                  textTransform: "uppercase",
                  color: "var(--text-muted)",
                  marginBottom: 12,
                }}
              >
                Examples of queries:
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {EXAMPLE_PRS.map((ex) => (
                  <button
                    key={ex.url}
                    type="button"
                    className="gp-chip"
                    onClick={() => submitReview(ex.url)}
                  >
                    <span>{ex.label}</span>
                    <span
                      style={{
                        color: "var(--text-muted)",
                        fontSize: 17,
                        lineHeight: 1,
                      }}
                    >
                      ›
                    </span>
                  </button>
                ))}
              </div>

              {/* Required by tests — visually styled as a subtle note */}
              <p
                style={{
                  marginTop: 28,
                  fontSize: 13,
                  color: "var(--text-muted)",
                  textAlign: "center",
                  lineHeight: 1.5,
                }}
              >
                Paste a GitHub PR URL above to get an AI-powered code review.
              </p>
            </div>
          )}

          {/* Review history */}
          <div
            className="gp-fade gp-delay-4"
            style={{ marginTop: 56, paddingTop: 32, borderTop: "1px solid var(--border)" }}
          >
            <HistorySidebar
              reviews={reviews}
              activeReviewId={activeReview?.id ?? null}
              onSelect={handleHistorySelect}
              isLoading={isHistoryLoading}
              isError={isHistoryError}
            />
          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer
        style={{
          position: "relative",
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 24px",
          borderTop: "1px solid var(--border)",
        }}
      >
        {/* Social icons */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--text-muted)", transition: "color 0.15s", lineHeight: 0 }}
            aria-label="GitHub"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
          </a>
        </div>

        {/* Legal links */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontSize: 12,
            color: "var(--text-muted)",
          }}
        >
          <span>Privacy</span>
          <span style={{ opacity: 0.35 }}>/</span>
          <span>Terms</span>
        </div>
      </footer>
    </div>
  );
}
