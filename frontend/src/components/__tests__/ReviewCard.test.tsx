import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import { ReviewCard } from "../ReviewCard";
import type { Review } from "../../types/review";

const baseReview: Review = {
  id: "rev-1",
  sessionId: "sess-1",
  prUrl: "https://github.com/owner/repo/pull/1",
  prTitle: "feat: implement awesome feature",
  repoOwner: "owner",
  repoName: "repo",
  prNumber: 1,
  summary: "Overall this PR looks solid with minor issues.",
  keyChanges: ["Add awesome feature", "Update tests"],
  fileReviews: [
    {
      filename: "src/utils.ts",
      comments: [
        {
          line: 10,
          category: "style",
          severity: "warning",
          message: "Consider extracting this logic",
          suggestion: "Extract to a separate helper function",
        },
        {
          line: null,
          category: "other",
          severity: "info",
          message: "Good use of types here",
          suggestion: null,
        },
      ],
    },
    {
      filename: "src/index.ts",
      comments: [
        {
          line: 5,
          category: "bug",
          severity: "error",
          message: "Missing error handling",
          suggestion: null,
        },
      ],
    },
  ],
  riskLevel: "medium",
  createdAt: "2024-01-01T00:00:00.000Z",
};

describe("ReviewCard", () => {
  it("renders the PR title", () => {
    render(<ReviewCard review={baseReview} />);
    expect(screen.getByTestId("pr-title")).toHaveTextContent(
      "feat: implement awesome feature"
    );
  });

  it("renders the risk badge with correct text", () => {
    render(<ReviewCard review={baseReview} />);
    const badge = screen.getByTestId("risk-badge");
    expect(badge).toHaveTextContent("medium");
  });

  it("renders the summary", () => {
    render(<ReviewCard review={baseReview} />);
    expect(screen.getByTestId("review-summary")).toHaveTextContent(
      "Overall this PR looks solid with minor issues."
    );
  });

  it("renders file names", () => {
    render(<ReviewCard review={baseReview} />);
    expect(screen.getByText("src/utils.ts")).toBeInTheDocument();
    expect(screen.getByText("src/index.ts")).toBeInTheDocument();
  });

  it("renders comment messages", () => {
    render(<ReviewCard review={baseReview} />);
    expect(
      screen.getByText("Consider extracting this logic")
    ).toBeInTheDocument();
    expect(screen.getByText("Good use of types here")).toBeInTheDocument();
    expect(screen.getByText("Missing error handling")).toBeInTheDocument();
  });

  it("shows suggestion when present", () => {
    render(<ReviewCard review={baseReview} />);
    expect(
      screen.getByText("Extract to a separate helper function")
    ).toBeInTheDocument();
  });

  it("does not render suggestion element when suggestion is null", () => {
    render(<ReviewCard review={baseReview} />);
    // The comment with null suggestion should not render any suggestion text
    // "Missing error handling" has suggestion=null — its entry should exist but no suggestion text
    const comments = screen.getAllByText(/Missing error handling/);
    expect(comments.length).toBeGreaterThan(0);
    // The suggestion paragraph for that comment should not be present
    expect(
      screen.queryByText("Suggestion: null")
    ).not.toBeInTheDocument();
  });

  it("toggles comments visibility when filename is clicked", async () => {
    const user = userEvent.setup();
    render(<ReviewCard review={baseReview} />);

    // Comments should be visible by default
    expect(
      screen.getByText("Consider extracting this logic")
    ).toBeInTheDocument();

    // Click the filename to collapse
    await user.click(screen.getByText("src/utils.ts"));

    // Comments for that file should now be hidden
    expect(
      screen.queryByText("Consider extracting this logic")
    ).not.toBeInTheDocument();

    // Click again to expand
    await user.click(screen.getByText("src/utils.ts"));

    expect(
      screen.getByText("Consider extracting this logic")
    ).toBeInTheDocument();
  });

  it("renders key changes bullet list", () => {
    render(<ReviewCard review={baseReview} />);
    const list = screen.getByTestId("key-changes");
    expect(list).toBeInTheDocument();
    expect(screen.getByText("Add awesome feature")).toBeInTheDocument();
    expect(screen.getByText("Update tests")).toBeInTheDocument();
  });

  it("does not render key changes section when keyChanges is empty", () => {
    const review = { ...baseReview, keyChanges: [] };
    render(<ReviewCard review={review} />);
    expect(screen.queryByTestId("key-changes")).not.toBeInTheDocument();
  });

  it("renders category badges on comments", () => {
    render(<ReviewCard review={baseReview} />);
    expect(screen.getByText("style")).toBeInTheDocument();
    expect(screen.getByText("bug")).toBeInTheDocument();
  });

  it("renders green color class for low risk level", () => {
    const review = { ...baseReview, riskLevel: "low" as const };
    render(<ReviewCard review={review} />);
    const badge = screen.getByTestId("risk-badge");
    expect(badge.className).toMatch(/green/);
  });

  it("renders yellow color class for medium risk level", () => {
    render(<ReviewCard review={baseReview} />);
    const badge = screen.getByTestId("risk-badge");
    expect(badge.className).toMatch(/yellow/);
  });

  it("renders orange color class for high risk level", () => {
    const review = { ...baseReview, riskLevel: "high" as const };
    render(<ReviewCard review={review} />);
    const badge = screen.getByTestId("risk-badge");
    expect(badge.className).toMatch(/orange/);
  });

  it("renders red color class for critical risk level", () => {
    const review = { ...baseReview, riskLevel: "critical" as const };
    render(<ReviewCard review={review} />);
    const badge = screen.getByTestId("risk-badge");
    expect(badge.className).toMatch(/red/);
  });
});
