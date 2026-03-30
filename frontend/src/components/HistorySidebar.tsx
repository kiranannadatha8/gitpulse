import type { Review } from "../types/review";

const RISK_BADGE_CLASSES: Record<Review["riskLevel"], string> = {
  low: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800",
};

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface HistorySidebarProps {
  reviews: Review[];
  activeReviewId: string | null;
  onSelect: (review: Review) => void;
  isLoading: boolean;
  isError: boolean;
}

export function HistorySidebar({
  reviews,
  activeReviewId,
  onSelect,
  isLoading,
  isError,
}: HistorySidebarProps): JSX.Element {
  return (
    <aside className="flex flex-col h-full bg-white border-r border-gray-200 w-64 shrink-0">
      <div className="px-4 py-3 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
          History
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <ul className="flex flex-col gap-2 p-3">
            <li className="animate-pulse h-14 bg-gray-100 rounded-md" />
            <li className="animate-pulse h-14 bg-gray-100 rounded-md" />
            <li className="animate-pulse h-14 bg-gray-100 rounded-md" />
          </ul>
        )}

        {!isLoading && isError && (
          <p role="alert" className="px-4 py-6 text-sm text-red-500">
            Failed to load history.
          </p>
        )}

        {!isLoading && !isError && reviews.length === 0 && (
          <p className="px-4 py-6 text-sm text-gray-500">No reviews yet.</p>
        )}

        {!isLoading && !isError && reviews.length > 0 && (
          <ul className="flex flex-col">
            {reviews.map((review) => {
              const isActive = review.id === activeReviewId;
              return (
                <li
                  key={review.id}
                  className={`cursor-pointer px-4 py-3 border-b border-gray-100 hover:bg-gray-50 ${
                    isActive ? "bg-blue-50" : "bg-white"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelect(review)}
                    className="w-full text-left flex flex-col gap-1"
                  >
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {review.prTitle}
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {review.repoOwner}/{review.repoName}
                      </span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-xs font-semibold capitalize ${RISK_BADGE_CLASSES[review.riskLevel]}`}
                      >
                        {review.riskLevel}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {formatDate(review.createdAt)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
