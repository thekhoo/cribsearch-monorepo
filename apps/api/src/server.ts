import { createApp } from "./app";
import { env } from "./config/env";

/** Local development entry point. In AWS, src/handler.ts is used instead. */
const app = createApp();

app.listen(env.port, () => {
  console.info(`API listening on http://localhost:${env.port} (${env.nodeEnv})`);
});
