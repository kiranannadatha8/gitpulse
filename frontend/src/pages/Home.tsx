import { useState, useEffect } from "react";
import { FaGithub } from "react-icons/fa";
import { useReview } from "../hooks/useReview";
import { useHistory } from "../hooks/useHistory";
import { useAuth } from "../hooks/useAuth";
import { PRInput } from "../components/PRInput";
import { LoadingState } from "../components/LoadingState";
import { ReviewCard } from "../components/ReviewCard";
import { HistorySidebar } from "../components/HistorySidebar";
import { AuthDialog } from "../components/AuthDialog";
import { UserMenu } from "../components/UserMenu";
import { cn } from "@/lib/utils";
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
  const {
    reviews,
    isLoading: isHistoryLoading,
    isError: isHistoryError,
  } = useHistory();
  const { isAuthenticated } = useAuth();

  const [activeReview, setActiveReview] = useState<Review | null>(null);

  useEffect(() => {
    if (review !== null) setActiveReview(review);
  }, [review]);

  const showIdle = !isPending && activeReview === null;

  return (
    <div
      className="relative min-h-screen overflow-x-hidden"
      style={{ background: "var(--bg)", fontFamily: "var(--font-ui)" }}
    >
      {/* ── Ambient glow ── */}
      <div
        aria-hidden="true"
        className="absolute inset-0 flex justify-center pointer-events-none overflow-hidden"
      >
        <div className="gp-glow" />
      </div>

      {/* ── Header ── */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <FaGithub size={24} />
          <span
            className="text-[17px] font-medium text-foreground tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            GitPulse
          </span>
        </div>

        {/* Auth */}
        {isAuthenticated ? <UserMenu /> : <AuthDialog />}
      </header>

      {/* ── Main ── */}
      <main className="relative z-10 flex flex-col items-center px-4 pt-12 pb-20">
        <div className="w-full max-w-[660px]">
          {/* Hero heading */}
          <div className={cn("text-center mb-9", "gp-fade gp-delay-1")}>
            <h1
              className="text-[clamp(28px,5vw,44px)] font-normal tracking-tight leading-[1.18] text-foreground"
              style={{ fontFamily: "var(--font-display)", fontWeight: 400 }}
            >
              Review any pull request.
            </h1>
            <p className="mt-3 text-[15px] text-muted-foreground font-light leading-relaxed">
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
              className="gp-fade mt-3 px-4 py-3 rounded-xl border border-destructive/30 bg-destructive/5 text-[13px] text-destructive"
            >
              {error?.message ?? "Something went wrong. Please try again."}
            </div>
          )}

          {/* Loading */}
          {isPending && (
            <div className="gp-fade mt-6">
              <LoadingState />
            </div>
          )}

          {/* Review result */}
          {!isPending && activeReview !== null && (
            <div className="gp-fade mt-6">
              <ReviewCard review={activeReview} />
            </div>
          )}

          {/* Idle: example chips + placeholder */}
          {showIdle && (
            <div className="gp-fade gp-delay-3 mt-7">
              <p className="text-[11px] font-medium tracking-widest uppercase text-muted-foreground mb-3">
                Examples of queries:
              </p>
              <div className="flex flex-col gap-1.5">
                {EXAMPLE_PRS.map((ex) => (
                  <button
                    key={ex.url}
                    type="button"
                    className="gp-chip"
                    onClick={() => submitReview(ex.url)}
                  >
                    <span>{ex.label}</span>
                    <span className="text-muted-foreground text-[17px] leading-none">
                      ›
                    </span>
                  </button>
                ))}
              </div>

              {/* Required by tests: exact placeholder text */}
              <p className="mt-7 text-[13px] text-muted-foreground text-center leading-relaxed">
                Paste a GitHub PR URL above to get an AI-powered code review.
              </p>
            </div>
          )}

          {/* History */}
          <div className="gp-fade gp-delay-4 mt-14 pt-8 border-t border-border">
            <HistorySidebar
              reviews={reviews}
              activeReviewId={activeReview?.id ?? null}
              onSelect={(r) => setActiveReview(r)}
              isLoading={isHistoryLoading}
              isError={isHistoryError}
            />
          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="relative z-10 flex items-center justify-between px-6 py-3.5 border-t border-border">
        <div className="flex items-center gap-4">
          <a
            href="https://github.com/kiranannadatha8/gitpulse"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="GitHub"
          >
            <FaGithub size={16} />
          </a>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>Privacy</span>
          <span className="opacity-30">/</span>
          <span>Terms</span>
        </div>
      </footer>
    </div>
  );
}
