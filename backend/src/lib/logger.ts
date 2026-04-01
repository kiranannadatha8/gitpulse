import pino from "pino";

const isDev = process.env.NODE_ENV === "development";

const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  // Redact sensitive fields from all log lines before they leave the process
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      'req.headers["set-cookie"]',
    ],
    censor: "[REDACTED]",
  },
  transport: isDev
    ? { target: "pino-pretty", options: { colorize: true } }
    : undefined,
});

export default logger;
