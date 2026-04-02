export interface Comment {
  line: number | null;
  category: "bug" | "security" | "performance" | "style" | "test" | "docs" | "other";
  severity: "info" | "warning" | "error" | "critical";
  message: string;
  suggestion: string | null;
}

export interface FileReview {
  filename: string;
  comments: Comment[];
}

export interface Review {
  id: string;
  sessionId: string;
  prUrl: string;
  prTitle: string;
  repoOwner: string;
  repoName: string;
  prNumber: number;
  summary: string;
  keyChanges: string[];
  fileReviews: FileReview[];
  riskLevel: "low" | "medium" | "high" | "critical";
  createdAt: string;
}
