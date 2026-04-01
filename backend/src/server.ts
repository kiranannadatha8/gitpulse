// Sentry must be initialized before any other imports so it can instrument
// all modules (express, http, prisma, etc.) from the start.
import { initSentry } from "./lib/sentry.js";
initSentry();

import { env } from "./lib/env.js";
import logger from "./lib/logger.js";
import app from "./app.js";

app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, "GitPulse backend started");
});
