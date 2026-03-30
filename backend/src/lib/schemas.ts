import { z } from "zod";

// Request body for POST /api/reviews
export const ReviewRequestSchema = z.object({
  prUrl: z.string().url("prUrl must be a valid URL"),
  sessionId: z.string().min(1, "sessionId is required"),
});

export type ReviewRequest = z.infer<typeof ReviewRequestSchema>;

// Shape of a single review comment
export const CommentSchema = z.object({
  line: z.number().int().nullable(),
  severity: z.enum(["info", "warning", "error", "critical"]),
  message: z.string().min(1),
  suggestion: z.string().nullable(),
});

export type Comment = z.infer<typeof CommentSchema>;

// Shape of a per-file review
export const FileReviewSchema = z.object({
  filename: z.string().min(1),
  comments: z.array(CommentSchema),
});

export type FileReview = z.infer<typeof FileReviewSchema>;

// Shape the AI model must return (for validation)
export const AIResponseSchema = z.object({
  summary: z.string().min(1),
  riskLevel: z.enum(["low", "medium", "high", "critical"]),
  fileReviews: z.array(FileReviewSchema),
});

export type AIResponse = z.infer<typeof AIResponseSchema>;

// Final API response shape
export const ReviewResponseSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().min(1),
  prUrl: z.string().url(),
  prTitle: z.string(),
  repoOwner: z.string(),
  repoName: z.string(),
  prNumber: z.number().int().positive(),
  summary: z.string(),
  fileReviews: z.array(FileReviewSchema),
  riskLevel: z.enum(["low", "medium", "high", "critical"]),
  createdAt: z.string().datetime(),
});

export type ReviewResponse = z.infer<typeof ReviewResponseSchema>;
