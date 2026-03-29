import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { HistorySidebar } from "../HistorySidebar";
import type { Review } from "../../types/review";

const mockReviews: Review[] = [
  {
    id: "rev-1",
    sessionId: "sess-1",
    prUrl: "https://github.com/owner/repo/pull/1",
    prTitle: "feat: first feature",
    repoOwner: "owner",
    repoName: "repo",
    prNumber: 1,
    summary: "Good PR",
    fileReviews: [],
    riskLevel: "low",
    createdAt: "2024-01-15T10:00:00.000Z",
  },
  {
    id: "rev-2",
    sessionId: "sess-1",
    prUrl: "https://github.com/owner/repo/pull/2",
    prTitle: "fix: second fix",
    repoOwner: "owner",
    repoName: "repo",
    prNumber: 2,
    summary: "Nice fix",
    fileReviews: [],
    riskLevel: "high",
    createdAt: "2024-01-20T10:00:00.000Z",
  },
];

describe("HistorySidebar", () => {
  const onSelect = vi.fn();

  beforeEach(() => {
    onSelect.mockReset();
  });

  it("shows loading skeletons when isLoading=true", () => {
    render(
      <HistorySidebar
        reviews={[]}
        activeReviewId={null}
        onSelect={onSelect}
        isLoading={true}
      />
    );

    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThanOrEqual(3);
  });

  it('shows "No reviews yet." when reviews is empty and not loading', () => {
    render(
      <HistorySidebar
        reviews={[]}
        activeReviewId={null}
        onSelect={onSelect}
        isLoading={false}
      />
    );

    expect(screen.getByText("No reviews yet.")).toBeInTheDocument();
  });

  it("renders list of review titles", () => {
    render(
      <HistorySidebar
        reviews={mockReviews}
        activeReviewId={null}
        onSelect={onSelect}
        isLoading={false}
      />
    );

    expect(screen.getByText("feat: first feature")).toBeInTheDocument();
    expect(screen.getByText("fix: second fix")).toBeInTheDocument();
  });

  it("renders repo name for each item", () => {
    render(
      <HistorySidebar
        reviews={mockReviews}
        activeReviewId={null}
        onSelect={onSelect}
        isLoading={false}
      />
    );

    const repoLabels = screen.getAllByText("owner/repo");
    expect(repoLabels.length).toBe(2);
  });

  it("calls onSelect with the clicked review", async () => {
    const user = userEvent.setup();
    render(
      <HistorySidebar
        reviews={mockReviews}
        activeReviewId={null}
        onSelect={onSelect}
        isLoading={false}
      />
    );

    await user.click(screen.getByText("feat: first feature"));
    expect(onSelect).toHaveBeenCalledOnce();
    expect(onSelect).toHaveBeenCalledWith(mockReviews[0]);
  });

  it("highlights the active review with a different background", () => {
    render(
      <HistorySidebar
        reviews={mockReviews}
        activeReviewId="rev-1"
        onSelect={onSelect}
        isLoading={false}
      />
    );

    const activeItem = screen.getByText("feat: first feature").closest("li");
    const inactiveItem = screen.getByText("fix: second fix").closest("li");

    expect(activeItem?.className).not.toBe(inactiveItem?.className);
  });

  it("renders a heading 'History'", () => {
    render(
      <HistorySidebar
        reviews={[]}
        activeReviewId={null}
        onSelect={onSelect}
        isLoading={false}
      />
    );

    expect(screen.getByText("History")).toBeInTheDocument();
  });
});
