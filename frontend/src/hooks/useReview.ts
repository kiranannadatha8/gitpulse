import { useMutation, useQueryClient } from "@tanstack/react-query";
import { submitReview as submitReviewApi } from "../lib/api";
import type { Review } from "../types/review";

export function useReview(): {
  submitReview: (prUrl: string) => void;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  review: Review | null;
} {
  const queryClient = useQueryClient();

  const mutation = useMutation<Review, Error, string>({
    mutationFn: submitReviewApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
    },
  });

  return {
    submitReview: mutation.mutate,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    review: mutation.data ?? null,
  };
}
