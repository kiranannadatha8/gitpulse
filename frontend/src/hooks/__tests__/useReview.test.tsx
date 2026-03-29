import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi, describe, it, expect, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { useReview } from "../useReview";
import type { Review } from "../../types/review";

vi.mock("../../lib/api");

import * as api from "../../lib/api";

const mockReview: Review = {
  id: "rev-1",
  sessionId: "sess-1",
  prUrl: "https://github.com/owner/repo/pull/1",
  prTitle: "feat: add feature",
  repoOwner: "owner",
  repoName: "repo",
  prNumber: 1,
  summary: "Looks good",
  fileReviews: [],
  riskLevel: "low",
  createdAt: "2024-01-01T00:00:00.000Z",
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe("useReview", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("has correct initial state: isPending=false, isError=false, review=null", () => {
    const { result } = renderHook(() => useReview(), {
      wrapper: createWrapper(),
    });
    expect(result.current.isPending).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.review).toBeNull();
  });

  it("sets isPending=true while the mutation is in-flight", async () => {
    let resolve!: (r: Review) => void;
    vi.mocked(api.submitReview).mockReturnValue(
      new Promise<Review>((res) => {
        resolve = res;
      })
    );

    const { result } = renderHook(() => useReview(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.submitReview(
        "https://github.com/owner/repo/pull/1"
      );
    });

    await waitFor(() => expect(result.current.isPending).toBe(true));

    resolve(mockReview);
  });

  it("sets review to the returned data on success", async () => {
    vi.mocked(api.submitReview).mockResolvedValue(mockReview);

    const { result } = renderHook(() => useReview(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.submitReview(
        "https://github.com/owner/repo/pull/1"
      );
    });

    await waitFor(() => expect(result.current.review).toEqual(mockReview));
    expect(result.current.isPending).toBe(false);
    expect(result.current.isError).toBe(false);
  });

  it("sets isError=true and error when the mutation fails", async () => {
    const networkError = new Error("Network Error");
    vi.mocked(api.submitReview).mockRejectedValue(networkError);

    const { result } = renderHook(() => useReview(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.submitReview(
        "https://github.com/owner/repo/pull/1"
      );
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(networkError);
    expect(result.current.review).toBeNull();
  });
});
