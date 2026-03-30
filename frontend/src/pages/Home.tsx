import { useState, useEffect } from "react";
import { useReview } from "../hooks/useReview";
import { useHistory } from "../hooks/useHistory";
import { PRInput } from "../components/PRInput";
import { LoadingState } from "../components/LoadingState";
import { ReviewCard } from "../components/ReviewCard";
import { HistorySidebar } from "../components/HistorySidebar";
import type { Review } from "../types/review";

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

  return (
    <div className="flex h-screen overflow-hidden">
      <HistorySidebar
        reviews={reviews}
        activeReviewId={activeReview?.id ?? null}
        onSelect={handleHistorySelect}
        isLoading={isHistoryLoading}
        isError={isHistoryError}
      />

      <main className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
        <PRInput onSubmit={submitReview} isLoading={isPending} />

        {isError && (
          <div role="alert" className="rounded-md bg-red-50 border border-red-200 px-4 py-3">
            <p className="text-sm text-red-700">
              {error?.message ?? "Something went wrong. Please try again."}
            </p>
          </div>
        )}

        {isPending && <LoadingState />}

        {!isPending && activeReview !== null && (
          <ReviewCard review={activeReview} />
        )}

        {!isPending && !isError && activeReview === null && (
          <p className="text-gray-500 text-sm">
            Paste a GitHub PR URL above to get an AI-powered code review.
          </p>
        )}
      </main>
    </div>
  );
}
