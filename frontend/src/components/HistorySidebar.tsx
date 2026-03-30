import type { Review } from "../types/review";

// Tailwind classes kept for test compatibility (tests assert className contains color words)
const RISK_BADGE_CLASSES: Record<Review["riskLevel"], string> = {
  low:      "bg-green-100 text-green-800",
  medium:   "bg-yellow-100 text-yellow-800",
  high:     "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800",
};

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString("en-US", {
    month: "short",
    day:   "numeric",
    year:  "numeric",
  });
}

interface HistorySidebarProps {
  reviews:       Review[];
  activeReviewId: string | null;
  onSelect:      (review: Review) => void;
  isLoading:     boolean;
  isError?:      boolean;
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
      {/* "History" heading — required by tests */}
      <h2
        style={{
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--text-muted)",
          marginBottom: 14,
          fontFamily: "var(--font-ui)",
        }}
      >
        History
      </h2>

      {isLoading && (
        <ul style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[0, 1, 2].map((i) => (
            <li
              key={i}
              className="animate-pulse"
              style={{
                height: 60,
                background: "#edeae3",
                borderRadius: 12,
                animationDelay: `${i * 0.1}s`,
              }}
            />
          ))}
        </ul>
      )}

      {!isLoading && isError && (
        <p
          role="alert"
          style={{ fontSize: 13, color: "#dc2626", fontFamily: "var(--font-ui)" }}
        >
          Failed to load history.
        </p>
      )}

      {!isLoading && !isError && reviews.length === 0 && (
        <p style={{ fontSize: 13, color: "var(--text-muted)", fontFamily: "var(--font-ui)" }}>
          No reviews yet.
        </p>
      )}

      {!isLoading && !isError && reviews.length > 0 && (
        <ul style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {reviews.map((review) => {
            const isActive = review.id === activeReviewId;
            return (
              <li
                key={review.id}
                className={`gp-history-item ${isActive ? "is-active" : "is-inactive"}`}
              >
                <button
                  type="button"
                  onClick={() => onSelect(review)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "12px 16px",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "var(--font-ui)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: 12,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: "var(--text-primary)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      {review.prTitle}
                    </span>
                    <span
                      className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-semibold capitalize ${RISK_BADGE_CLASSES[review.riskLevel]}`}
                    >
                      {review.riskLevel}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginTop: 4,
                    }}
                  >
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      {review.repoOwner}/{review.repoName}
                    </span>
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
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
