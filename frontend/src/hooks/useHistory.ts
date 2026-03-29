import { useQuery } from "@tanstack/react-query";
import { fetchHistory } from "../lib/api";
import type { Review } from "../types/review";

export function useHistory(): {
  reviews: Review[];
  isLoading: boolean;
  isError: boolean;
} {
  const { data, isLoading, isError } = useQuery<Review[], Error>({
    queryKey: ["reviews"],
    queryFn: fetchHistory,
  });

  return {
    reviews: data ?? [],
    isLoading,
    isError,
  };
}
