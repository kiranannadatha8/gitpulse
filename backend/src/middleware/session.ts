import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { env } from "../lib/env.js";

const PgStore = connectPgSimple(session);

// Expose the express-session middleware
export const sessionMiddleware = session({
  store: new PgStore({
    conString: env.DATABASE_URL,
    createTableIfMissing: true,
    tableName: "sessions",
  }),
  secret: env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  name: "connect.sid",
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    secure: env.NODE_ENV === "production",
  },
});

// Augment Express Request with sessionId for backwards compatibility
// req.sessionId = req.session.id so all existing services continue to work unchanged
declare global {
  namespace Express {
    interface Request {
      sessionId: string;
    }
  }
}

import type { Request, Response, NextFunction } from "express";

export function attachSessionId(req: Request, _res: Response, next: NextFunction): void {
  req.sessionId = req.session.id;
  next();
}
