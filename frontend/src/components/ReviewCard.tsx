import { useState } from "react";
import type { Review, FileReview, Comment } from "../types/review";

// Tailwind classes kept verbatim — tests assert badge className contains color words
const RISK_BADGE_CLASSES: Record<Review["riskLevel"], string> = {
  low:      "bg-green-100 text-green-800",
  medium:   "bg-yellow-100 text-yellow-800",
  high:     "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800",
};

const SEVERITY_BADGE_CLASSES: Record<Comment["severity"], string> = {
  info:     "bg-blue-100 text-blue-800",
  warning:  "bg-yellow-100 text-yellow-800",
  error:    "bg-red-100 text-red-800",
  critical: "bg-red-200 text-red-900",
};

interface FileReviewSectionProps {
  fileReview: FileReview;
}

function FileReviewSection({ fileReview }: FileReviewSectionProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="gp-file-header"
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "9px 16px",
          textAlign: "left",
          border: "none",
          cursor: "pointer",
          fontFamily: "var(--font-ui)",
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: "var(--text-primary)",
            fontFamily: "ui-monospace, SFMono-Regular, monospace",
          }}
        >
          {fileReview.filename}
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          style={{
            color: "var(--text-muted)",
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.15s",
            flexShrink: 0,
          }}
        >
          <path
            d="M6 9l6 6 6-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {isOpen && (
        <ul>
          {fileReview.comments.map((comment, idx) => (
            <li
              key={`${comment.severity}-${comment.line ?? "null"}-${idx}`}
              style={{
                padding: "12px 16px",
                borderTop: idx === 0 ? "none" : "1px solid var(--border)",
                display: "flex",
                flexDirection: "column",
                gap: 5,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${SEVERITY_BADGE_CLASSES[comment.severity]}`}
                >
                  {comment.severity}
                </span>
                {comment.line !== null && (
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    Line {comment.line}
                  </span>
                )}
              </div>
              <p style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.5 }}>
                {comment.message}
              </p>
              {comment.suggestion !== null && (
                <p
                  style={{
                    fontSize: 12,
                    color: "var(--text-muted)",
                    fontStyle: "italic",
                    lineHeight: 1.4,
                  }}
                >
                  {comment.suggestion}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface ReviewCardProps {
  review: Review;
}

export function ReviewCard({ review }: ReviewCardProps): JSX.Element {
  return (
    <article className="gp-review-card">
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          padding: "20px 24px 16px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2
            data-testid="pr-title"
            style={{
              fontSize: 16,
              fontWeight: 500,
              color: "var(--text-primary)",
              fontFamily: "var(--font-ui)",
              lineHeight: 1.4,
              margin: 0,
            }}
          >
            {review.prTitle}
          </h2>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: 12,
              color: "var(--text-muted)",
              fontFamily: "ui-monospace, monospace",
            }}
          >
            {review.repoOwner}/{review.repoName} #{review.prNumber}
          </p>
        </div>

        <span
          data-testid="risk-badge"
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold capitalize ${RISK_BADGE_CLASSES[review.riskLevel]}`}
        >
          {review.riskLevel}
        </span>
      </div>

      {/* Summary */}
      <div style={{ padding: "16px 24px" }}>
        <p
          data-testid="review-summary"
          style={{
            fontSize: 14,
            color: "var(--text-primary)",
            lineHeight: 1.65,
            fontFamily: "var(--font-ui)",
            margin: 0,
          }}
        >
          {review.summary}
        </p>
      </div>

      {/* File reviews */}
      {review.fileReviews.length > 0 && (
        <div
          style={{
            padding: "0 24px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <p
            style={{
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
              marginBottom: 4,
              fontFamily: "var(--font-ui)",
            }}
          >
            File Reviews
          </p>
          {review.fileReviews.map((fileReview) => (
            <FileReviewSection key={fileReview.filename} fileReview={fileReview} />
          ))}
        </div>
      )}
    </article>
  );
}
