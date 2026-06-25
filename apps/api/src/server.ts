import { createApp } from "./app";
import { env } from "./config/env";
import { ports } from "./composition";

const app = createApp(ports);

app.listen(env.port, () => {
  console.info(`API listening on http://localhost:${env.port} (${env.nodeEnv})`);
});
