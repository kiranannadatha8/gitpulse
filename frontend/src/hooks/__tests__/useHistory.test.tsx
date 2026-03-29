import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi, describe, it, expect, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { useHistory } from "../useHistory";
import type { Review } from "../../types/review";

vi.mock("../../lib/api");

import * as api from "../../lib/api";

const mockReviews: Review[] = [
  {
    id: "rev-1",
    sessionId: "sess-1",
    prUrl: "https://github.com/owner/repo/pull/1",
    prTitle: "feat: first PR",
    repoOwner: "owner",
    repoName: "repo",
    prNumber: 1,
    summary: "Looks good",
    fileReviews: [],
    riskLevel: "low",
    createdAt: "2024-01-01T00:00:00.000Z",
  },
  {
    id: "rev-2",
    sessionId: "sess-1",
    prUrl: "https://github.com/owner/repo/pull/2",
    prTitle: "fix: second PR",
    repoOwner: "owner",
    repoName: "repo",
    prNumber: 2,
    summary: "Minor fix",
    fileReviews: [],
    riskLevel: "medium",
    createdAt: "2024-01-02T00:00:00.000Z",
  },
];

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe("useHistory", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns empty array while loading", () => {
    vi.mocked(api.fetchHistory).mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useHistory(), {
      wrapper: createWrapper(),
    });

    expect(result.current.reviews).toEqual([]);
    expect(result.current.isLoading).toBe(true);
  });

  it("returns reviews array on successful fetch", async () => {
    vi.mocked(api.fetchHistory).mockResolvedValue(mockReviews);

    const { result } = renderHook(() => useHistory(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.reviews).toEqual(mockReviews);
    expect(result.current.isError).toBe(false);
  });

  it("sets isError=true when fetch fails", async () => {
    vi.mocked(api.fetchHistory).mockRejectedValue(new Error("Fetch failed"));

    const { result } = renderHook(() => useHistory(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.reviews).toEqual([]);
  });
});
