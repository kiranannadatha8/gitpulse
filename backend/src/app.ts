import express, { type Request, type Response } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { env } from "./lib/env.js";
import { sessionMiddleware } from "./middleware/session.js";
import { errorHandler } from "./middleware/errorHandler.js";
import reviewsRouter from "./routes/reviews.js";

const app = express();

app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(sessionMiddleware);

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api", reviewsRouter);

app.use(errorHandler);

export default app;
