import serverless from "serverless-http";
import { createApp } from "./app";
import { ports } from "./composition";
import { initSupabase } from "./db/supabase";

const init = initSupabase();
const app = serverless(createApp(ports));

export const handler: serverless.Handler = async (event, context) => {
  await init;
  return app(event, context);
};
