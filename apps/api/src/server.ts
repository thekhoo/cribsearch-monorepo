import { logger } from "@cribsearch/logger";
import { createApp } from "./app";
import { env } from "./config/env";
import { initSupabase } from "./db/supabase";
import { ports } from "./composition";

const start = async () => {
  await initSupabase();
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
