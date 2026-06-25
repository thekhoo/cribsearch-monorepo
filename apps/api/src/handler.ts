import serverless from "serverless-http";
import { createApp } from "./app";
import { ports } from "./composition";

export const handler = serverless(createApp(ports));
