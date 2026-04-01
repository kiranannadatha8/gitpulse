import { parsePRUrl } from "../lib/parsePrUrl.js";
import { fetchPRDiff } from "./github.js";
import { analyzeDiff } from "./openai.js";
import { prisma } from "../lib/prisma.js";
import logger from "../lib/logger.js";
import type { Review } from "@prisma/client";

export async function createReview(
  prUrl: string,
  sessionId: string,
  userId?: string
): Promise<Review> {
  const start = Date.now();
  logger.info({ prUrl, sessionId }, "Creating review");

  const { owner, repo, prNumber } = parsePRUrl(prUrl);
  const prDiff = await fetchPRDiff(owner, repo, prNumber);

  const aiStart = Date.now();
  const analysis = await analyzeDiff(prDiff.title, prDiff.files);
  const aiDurationMs = Date.now() - aiStart;

  const review = await prisma.review.create({
    data: {
      sessionId,
      userId: userId ?? null,
      prUrl,
      prTitle: prDiff.title,
      repoOwner: owner,
      repoName: repo,
      prNumber,
      summary: analysis.summary,
      fileReviews: analysis.fileReviews,
      riskLevel: analysis.riskLevel,
    },
  });

  const totalDurationMs = Date.now() - start;
  logger.info(
    { reviewId: review.id, prUrl, sessionId, aiDurationMs, totalDurationMs },
    "Review created"
  );
  return review;
}

export async function getReviewsBySession(
  sessionId: string,
  userId?: string
): Promise<Review[]> {
  logger.info({ sessionId }, "Fetching reviews by session");

  // When a user is authenticated, return their reviews regardless of session
  const where = userId
    ? { userId }
    : { sessionId };

  const reviews = await prisma.review.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  logger.info({ sessionId, count: reviews.length }, "Reviews fetched");
  return reviews;
}

export async function migrateSessionReviews(
  sessionId: string,
  userId: string
): Promise<number> {
  const result = await prisma.review.updateMany({
    where: { sessionId, userId: null },
    data: { userId },
  });
  return result.count;
}
