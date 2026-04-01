import { Router, type Request, type Response, type NextFunction } from "express";
import passport from "../lib/passport.js";
import { env } from "../lib/env.js";
import { migrateSessionReviews } from "../services/review.js";
import logger from "../lib/logger.js";

const router = Router();

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
