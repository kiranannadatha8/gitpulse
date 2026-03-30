import { type Request, type Response, type NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import { env } from "../lib/env.js";

declare global {
  namespace Express {
    interface Request {
      sessionId: string;
    }
  }
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function sessionMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const existingId = req.cookies?.sessionId as string | undefined;

  if (existingId && UUID_REGEX.test(existingId)) {
    req.sessionId = existingId;
  } else {
    const newId = uuidv4();
    req.sessionId = newId;
    res.cookie("sessionId", newId, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: THIRTY_DAYS_MS,
      secure: env.NODE_ENV === "production",
    });
  }

  next();
}
