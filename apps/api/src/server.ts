import { logger } from "@homefinder/logger";
import { createApp } from "./app";
import { env } from "./config/env";
import { ports } from "./composition";

const app = createApp(ports);

app.listen(env.port, () => {
  logger.info("API listening", {
    port: env.port,
    nodeEnv: env.nodeEnv,
    url: `http://localhost:${env.port}`,
  });
});
