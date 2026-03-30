import { parsePRUrl } from "../lib/parsePrUrl.js";
import { fetchPRDiff } from "./github.js";
import { analyzeDiff } from "./openai.js";
import { prisma } from "../lib/prisma.js";
import logger from "../lib/logger.js";
import type { Review } from "@prisma/client";

export async function createReview(
  prUrl: string,
  sessionId: string
): Promise<Review> {
  logger.info({ prUrl, sessionId }, "Creating review");

  const { owner, repo, prNumber } = parsePRUrl(prUrl);

  const prDiff = await fetchPRDiff(owner, repo, prNumber);

  const analysis = await analyzeDiff(prDiff.title, prDiff.files);

  const review = await prisma.review.create({
    data: {
      sessionId,
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

  logger.info({ reviewId: review.id, prUrl, sessionId }, "Review created");

  return review;
}

export async function getReviewsBySession(sessionId: string): Promise<Review[]> {
  logger.info({ sessionId }, "Fetching reviews by session");

  const reviews = await prisma.review.findMany({
    where: { sessionId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  logger.info({ sessionId, count: reviews.length }, "Reviews fetched");

  return reviews;
}
