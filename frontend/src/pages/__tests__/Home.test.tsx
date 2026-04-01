import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Home } from "../Home";
import type { Review } from "../../types/review";

vi.mock("../../hooks/useReview");
vi.mock("../../hooks/useHistory");
vi.mock("../../hooks/useAuth");

import * as useReviewModule from "../../hooks/useReview";
import * as useHistoryModule from "../../hooks/useHistory";
import * as useAuthModule from "../../hooks/useAuth";

const mockReview: Review = {
  id: "rev-1",
  sessionId: "sess-1",
  prUrl: "https://github.com/owner/repo/pull/1",
  prTitle: "feat: test feature",
  repoOwner: "owner",
  repoName: "repo",
  prNumber: 1,
  summary: "This PR is well written.",
  fileReviews: [],
  riskLevel: "low",
  createdAt: "2024-01-01T00:00:00.000Z",
};

const mockReview2: Review = {
  id: "rev-2",
  sessionId: "sess-1",
  prUrl: "https://github.com/owner/repo/pull/2",
  prTitle: "fix: history item",
  repoOwner: "owner",
  repoName: "repo",
  prNumber: 2,
  summary: "Quick fix.",
  fileReviews: [],
  riskLevel: "medium",
  createdAt: "2024-01-02T00:00:00.000Z",
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

function setupMocks(overrides?: {
  useReview?: Partial<ReturnType<typeof useReviewModule.useReview>>;
  useHistory?: Partial<ReturnType<typeof useHistoryModule.useHistory>>;
}) {
  vi.mocked(useReviewModule.useReview).mockReturnValue({
    submitReview: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
    review: null,
    ...overrides?.useReview,
  });

  vi.mocked(useHistoryModule.useHistory).mockReturnValue({
    reviews: [],
    isLoading: false,
    isError: false,
    ...overrides?.useHistory,
  });

  vi.mocked(useAuthModule.useAuth).mockReturnValue({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
  });
}

describe("Home", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    setupMocks();
  });

  it("renders the PRInput component", () => {
    render(<Home />, { wrapper: createWrapper() });
    expect(
      screen.getByPlaceholderText("https://github.com/owner/repo/pull/123")
    ).toBeInTheDocument();
  });

  it("shows placeholder text when no review is active", () => {
    render(<Home />, { wrapper: createWrapper() });
    expect(
      screen.getByText(
        "Paste a GitHub PR URL above to get an AI-powered code review."
      )
    ).toBeInTheDocument();
  });

  it("shows LoadingState when isPending=true", () => {
    setupMocks({ useReview: { isPending: true } });
    render(<Home />, { wrapper: createWrapper() });
    expect(screen.getByTestId("loading-state")).toBeInTheDocument();
  });

  it("does not show placeholder text when isPending=true", () => {
    setupMocks({ useReview: { isPending: true } });
    render(<Home />, { wrapper: createWrapper() });
    expect(
      screen.queryByText(
        "Paste a GitHub PR URL above to get an AI-powered code review."
      )
    ).not.toBeInTheDocument();
  });

  it("shows ReviewCard when a review is returned from useReview", () => {
    setupMocks({ useReview: { review: mockReview } });
    render(<Home />, { wrapper: createWrapper() });
    expect(screen.getByTestId("pr-title")).toHaveTextContent(
      "feat: test feature"
    );
  });

  it("sets activeReview when a history item is clicked", async () => {
    const user = userEvent.setup();
    setupMocks({
      useHistory: { reviews: [mockReview2] },
    });

    render(<Home />, { wrapper: createWrapper() });

    await user.click(screen.getByText("fix: history item"));

    expect(screen.getByTestId("pr-title")).toHaveTextContent(
      "fix: history item"
    );
  });

  it("renders HistorySidebar with History heading", () => {
    render(<Home />, { wrapper: createWrapper() });
    expect(screen.getByText("History")).toBeInTheDocument();
  });
});
