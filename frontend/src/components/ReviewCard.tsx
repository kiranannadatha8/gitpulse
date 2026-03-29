import { useState } from "react";
import type { Review, FileReview, Comment } from "../types/review";

const RISK_BADGE_CLASSES: Record<Review["riskLevel"], string> = {
  low: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800",
};

const SEVERITY_BADGE_CLASSES: Record<Comment["severity"], string> = {
  info: "bg-blue-100 text-blue-800",
  warning: "bg-yellow-100 text-yellow-800",
  error: "bg-red-100 text-red-800",
  critical: "bg-red-200 text-red-900",
};

interface FileReviewSectionProps {
  fileReview: FileReview;
}

function FileReviewSection({ fileReview }: FileReviewSectionProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="border border-gray-200 rounded-md overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between px-4 py-2 bg-gray-50 text-left text-sm font-mono font-medium text-gray-700 hover:bg-gray-100"
      >
        <span>{fileReview.filename}</span>
        <span className="text-gray-400">{isOpen ? "▲" : "▼"}</span>
      </button>

      {isOpen && (
        <ul className="divide-y divide-gray-100">
          {fileReview.comments.map((comment, idx) => (
            <li key={idx} className="px-4 py-3 flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${SEVERITY_BADGE_CLASSES[comment.severity]}`}
                >
                  {comment.severity}
                </span>
                {comment.line !== null && (
                  <span className="text-xs text-gray-400">
                    Line {comment.line}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-800">{comment.message}</p>
              {comment.suggestion !== null && (
                <p className="text-xs text-gray-500 italic">
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
    <article className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <header className="flex items-start justify-between gap-4">
        <h2
          data-testid="pr-title"
          className="text-lg font-semibold text-gray-900"
        >
          {review.prTitle}
        </h2>
        <span
          data-testid="risk-badge"
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold capitalize ${RISK_BADGE_CLASSES[review.riskLevel]}`}
        >
          {review.riskLevel}
        </span>
      </header>

      <p
        data-testid="review-summary"
        className="text-sm text-gray-700 leading-relaxed"
      >
        {review.summary}
      </p>

      {review.fileReviews.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-gray-600">File Reviews</h3>
          <div className="flex flex-col gap-2">
            {review.fileReviews.map((fileReview) => (
              <FileReviewSection
                key={fileReview.filename}
                fileReview={fileReview}
              />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
