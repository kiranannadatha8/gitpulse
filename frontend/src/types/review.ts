export interface Comment {
  line: number | null;
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
  fileReviews: FileReview[];
  riskLevel: "low" | "medium" | "high" | "critical";
  createdAt: string;
}
