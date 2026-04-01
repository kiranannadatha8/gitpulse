import { Router, type Request, type Response, type NextFunction } from "express";
import passport from "../lib/passport.js";
import { env } from "../lib/env.js";
import { migrateSessionReviews, deleteUserReviews } from "../services/review.js";
import logger from "../lib/logger.js";
import { authRateLimit } from "../middleware/rateLimit.js";
import { requireAuth } from "../middleware/auth.js";
import { prisma } from "../lib/prisma.js";

const router = Router();

// Apply rate limit to all auth routes
router.use(authRateLimit);

// Redirect to GitHub OAuth
router.get(
  "/github",
  passport.authenticate("github", { scope: ["read:user", "user:email"] })
);

// GitHub OAuth callback
router.get(
  "/github/callback",
  passport.authenticate("github", { failureRedirect: `${env.FRONTEND_URL}?auth_error=true` }),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Migrate any anonymous reviews from this session to the authenticated user
      if (req.user && req.sessionId) {
        const count = await migrateSessionReviews(req.sessionId, req.user.id);
        if (count > 0) {
          logger.info({ userId: req.user.id, count }, "Migrated anonymous reviews to user");
        }
      }
      res.redirect(env.FRONTEND_URL);
    } catch (err) {
      next(err);
    }
  }
);

// Return current authenticated user (null if not logged in)
router.get("/me", (req: Request, res: Response): void => {
  if (!req.user) {
    res.json(null);
    return;
  }
  // Omit internal fields, return only what the frontend needs
  const { id, username, displayName, email, avatarUrl } = req.user;
  res.json({ id, username, displayName, email, avatarUrl });
});

// Export all data for the authenticated user (GDPR portability)
router.get(
  "/account/data",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const [user, reviews] = await Promise.all([
        prisma.user.findUniqueOrThrow({ where: { id: userId } }),
        prisma.review.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
        }),
      ]);

      res.json({
        exportedAt: new Date().toISOString(),
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          email: user.email,
          createdAt: user.createdAt,
        },
        reviews,
      });
    } catch (err) {
      next(err);
    }
  }
);

// Permanently delete the authenticated user's account and all associated data
router.delete(
  "/account",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;

      // Delete reviews first (onDelete: SetNull wouldn't remove them)
      const reviewCount = await deleteUserReviews(userId);
      // Delete user — cascades to Account records (onDelete: Cascade)
      await prisma.user.delete({ where: { id: userId } });

      logger.info({ userId, reviewCount }, "User account deleted");

      req.logout((err) => {
        if (err) return next(err);
        req.session.destroy((destroyErr) => {
          if (destroyErr) return next(destroyErr);
          res.clearCookie("connect.sid");
          res.json({ success: true });
        });
      });
    } catch (err) {
      next(err);
    }
  }
);

// Logout
router.post("/logout", (req: Request, res: Response, next: NextFunction): void => {
  req.logout((err) => {
    if (err) {
      next(err);
      return;
    }
    req.session.destroy((destroyErr) => {
      if (destroyErr) {
        next(destroyErr);
        return;
      }
      res.clearCookie("connect.sid");
      res.json({ success: true });
    });
  });
});

export default router;
