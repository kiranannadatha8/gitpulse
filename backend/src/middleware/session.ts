import { type Request, type Response, type NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";

declare global {
  namespace Express {
    interface Request {
      sessionId: string;
    }
  }
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function sessionMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const existingId = req.cookies?.sessionId as string | undefined;

  if (existingId && existingId.length > 0) {
    req.sessionId = existingId;
  } else {
    const newId = uuidv4();
    req.sessionId = newId;
    res.cookie("sessionId", newId, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: THIRTY_DAYS_MS,
    });
  }

  next();
}
