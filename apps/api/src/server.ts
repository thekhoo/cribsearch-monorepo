import { logger } from "@cribsearch/logger";
import { createApp } from "./app";
import { env } from "./config/env";
import { ports } from "./composition";

const start = async () => {
  const app = createApp(ports);
  app.listen(env.port, () => {
    logger.info("API listening", {
      port: env.port,
      nodeEnv: env.nodeEnv,
      url: `http://localhost:${env.port}`,
    });
  });
};

start().catch((err: unknown) => {
  logger.error("Failed to start server", { err });
  process.exit(1);
});
