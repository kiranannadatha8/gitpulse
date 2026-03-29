import { env } from "./lib/env.js";
import logger from "./lib/logger.js";
import app from "./app.js";

app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, "GitPulse backend started");
});
