import { logger } from "@cribsearch/logger";
import { createApp } from "./app";
import { env } from "./shared/config/env";
import { closePool } from "./shared/db/pool";

const start = async () => {
  const app = createApp();
  app.listen(env.port, () => {
    logger.info("API listening", {
      port: env.port,
      nodeEnv: env.nodeEnv,
      url: `http://localhost:${env.port}`,
    });
  });
};

process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, shutting down");
  await closePool();
  process.exit(0);
});

process.on("SIGINT", async () => {
  logger.info("SIGINT received, shutting down");
  await closePool();
  process.exit(0);
});

start().catch((err: unknown) => {
  logger.error("Failed to start server", { err });
  process.exit(1);
});
