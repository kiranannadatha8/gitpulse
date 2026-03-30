import { LuHistory, LuCircleAlert } from "react-icons/lu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Review } from "../types/review";

// Tailwind color classes retained — tests assert className contains color words
const RISK_BADGE_CLASSES: Record<Review["riskLevel"], string> = {
  low:      "bg-green-100 text-green-800 border-green-200",
  medium:   "bg-yellow-100 text-yellow-800 border-yellow-200",
  high:     "bg-orange-100 text-orange-800 border-orange-200",
  critical: "bg-red-100 text-red-800 border-red-200",
};

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString("en-US", {
    month: "short",
    day:   "numeric",
    year:  "numeric",
  });
}

interface HistorySidebarProps {
  reviews:        Review[];
  activeReviewId: string | null;
  onSelect:       (review: Review) => void;
  isLoading:      boolean;
  isError?:       boolean;
}

export function HistorySidebar({
  reviews,
  activeReviewId,
  onSelect,
  isLoading,
  isError = false,
}: HistorySidebarProps): JSX.Element {
  return (
    <section>
      {/* Section heading — "History" text required by tests */}
      <div className="flex items-center gap-2 mb-3">
        <LuHistory size={13} className="text-muted-foreground" aria-hidden="true" />
        <h2 className="text-[11px] font-medium tracking-[0.1em] uppercase text-muted-foreground">
          History
        </h2>
      </div>

      {/* Loading skeletons — animate-pulse required by tests (≥3 elements) */}
      {isLoading && (
        <ul className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <li
              key={i}
              className="animate-pulse h-[60px] rounded-xl bg-secondary"
              style={{ animationDelay: `${i * 0.1}s` }}
            />
          ))}
        </ul>
      )}

      {!isLoading && isError && (
        <div className="flex items-center gap-2">
          <LuCircleAlert size={13} className="text-destructive" aria-hidden="true" />
          <p role="alert" className="text-[13px] text-destructive">
            Failed to load history.
          </p>
        </div>
      )}

      {!isLoading && !isError && reviews.length === 0 && (
        <p className="text-[13px] text-muted-foreground">No reviews yet.</p>
      )}

      {!isLoading && !isError && reviews.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {reviews.map((review) => {
            const isActive = review.id === activeReviewId;
            return (
              <li
                key={review.id}
                className={cn(
                  "gp-history-item",
                  isActive ? "is-active" : "is-inactive"
                )}
              >
                <button
                  type="button"
                  onClick={() => onSelect(review)}
                  className="w-full text-left px-4 py-3 bg-transparent border-none cursor-pointer"
                  style={{ fontFamily: "var(--font-ui)" }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-[13px] font-medium text-foreground truncate flex-1 min-w-0">
                      {review.prTitle}
                    </span>
                    <Badge
                      className={cn(
                        "shrink-0 text-[10px] rounded capitalize",
                        RISK_BADGE_CLASSES[review.riskLevel]
                      )}
                    >
                      {review.riskLevel}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-muted-foreground">
                      {review.repoOwner}/{review.repoName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(review.createdAt)}
                    </span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
