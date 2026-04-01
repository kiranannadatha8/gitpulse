import crypto from "node:crypto";
import express, { type Request, type Response } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import pinoHttp from "pino-http";
import { env } from "./lib/env.js";
import logger from "./lib/logger.js";
import { prisma } from "./lib/prisma.js";
import { sessionMiddleware, attachSessionId } from "./middleware/session.js";
import { errorHandler } from "./middleware/errorHandler.js";
import reviewsRouter from "./routes/reviews.js";
import authRouter from "./routes/auth.js";
import passport from "./lib/passport.js";

const app = express();

// ── Request logging (pino-http) ──────────────────────────────────────────────
app.use(
  pinoHttp({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    logger: logger as any,
    // Attach a unique request ID to every request for log correlation
    genReqId: () => crypto.randomUUID(),
    // Don't log health checks — they're noisy and not useful
    autoLogging: {
      ignore: (req) => req.url === "/api/health",
    },
    customLogLevel: (_req, res) => {
      if (res.statusCode >= 500) return "error";
      if (res.statusCode >= 400) return "warn";
      return "info";
    },
    serializers: {
      req: (req) => ({
        id: req.id,
        method: req.method,
        url: req.url,
      }),
      res: (res) => ({
        statusCode: res.statusCode,
      }),
    },
  })
);

// ── CORS ─────────────────────────────────────────────────────────────────────
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// ── Session + Passport (order matters) ───────────────────────────────────────
app.use(sessionMiddleware);
app.use(attachSessionId);
app.use(passport.initialize());
app.use(passport.session());

// ── Health ────────────────────────────────────────────────────────────────────
app.get("/api/health", async (_req: Request, res: Response): Promise<void> => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", db: "ok", timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: "error", db: "unreachable", timestamp: new Date().toISOString() });
  }
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/auth", authRouter);
app.use("/api", reviewsRouter);

// ── Error handler (must be last) ─────────────────────────────────────────────
app.use(errorHandler);

export default app;
