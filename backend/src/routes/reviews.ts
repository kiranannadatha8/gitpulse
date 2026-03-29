import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { createReview, getReviewsBySession } from "../services/review.js";
import { reviewRateLimit } from "../middleware/rateLimit.js";

const router = Router();

const PostReviewSchema = z.object({
  prUrl: z.string().url("prUrl must be a valid URL"),
});

router.post(
  "/reviews",
  reviewRateLimit,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = PostReviewSchema.safeParse(req.body);
      if (!parsed.success) {
        next(parsed.error);
        return;
      }

      const review = await createReview(parsed.data.prUrl, req.sessionId);
      res.status(201).json(review);
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  "/reviews",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const reviews = await getReviewsBySession(req.sessionId);
      res.status(200).json(reviews);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
