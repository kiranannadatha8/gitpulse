import express, { type Request, type Response } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { env } from "./lib/env.js";
import { prisma } from "./lib/prisma.js";
import { sessionMiddleware, attachSessionId } from "./middleware/session.js";
import { errorHandler } from "./middleware/errorHandler.js";
import reviewsRouter from "./routes/reviews.js";
import authRouter from "./routes/auth.js";
import passport from "./lib/passport.js";

const app = express();

app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// Session + Passport (order matters)
app.use(sessionMiddleware);
app.use(attachSessionId);
app.use(passport.initialize());
app.use(passport.session());

app.get("/api/health", async (_req: Request, res: Response): Promise<void> => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", db: "ok", timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: "error", db: "unreachable", timestamp: new Date().toISOString() });
  }
});

app.use("/api/auth", authRouter);
app.use("/api", reviewsRouter);

app.use(errorHandler);

export default app;
