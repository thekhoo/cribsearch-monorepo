import serverless from "serverless-http";
import { createApp } from "./app";

/** AWS Lambda entry point. API Gateway proxies all requests to the Express app. */
export const handler = serverless(createApp());
