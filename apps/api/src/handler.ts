import serverless from "serverless-http";
import { createApp } from "./app";
import { ports } from "./composition";

// Supabase init is deferred until a Supabase-backed adapter is wired in
// (composition currently uses an in-memory repository). See ADR 0005.
export const handler: serverless.Handler = serverless(createApp(ports));
