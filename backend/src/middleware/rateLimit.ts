import rateLimit, { type RateLimitRequestHandler } from "express-rate-limit";

export const reviewRateLimit: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many requests, please try again later.",
  },
});
