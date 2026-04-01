import rateLimit, { type RateLimitRequestHandler } from "express-rate-limit";

const rateLimitMessage = {
  success: false,
  error: "Too many requests, please try again later.",
};

// 10 review requests per minute per IP
export const reviewRateLimit: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage,
});

// 20 auth-related requests per 15 minutes per IP
// Covers OAuth initiation, /me polling, and logout
export const authRateLimit: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage,
});
