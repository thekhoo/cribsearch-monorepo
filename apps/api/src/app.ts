import express, { type Express, type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import { randomUUID } from "node:crypto";
import { logger, serializeError, type Logger } from "@cribsearch/logger";
import type { ApiError } from "@cribsearch/shared-types";
import { env } from "./shared/config/env";
import { healthRouter } from "./routes/health";
import { journeyRouter } from "./features/journey/controller/journey-routes";

export const createApp = (): Express => {
  const app = express();

  app.use(express.json());

  app.use(
    cors({
      origin: env.corsAllowedOrigins,
      methods: ["GET", "POST", "OPTIONS"],
      allowedHeaders: ["Content-Type", "x-request-id"],
      exposedHeaders: ["x-request-id"],
    }),
  );

  // Attach a request-scoped logger with a correlation id.
  app.use((req, res, next) => {
    const headerId = req.headers["x-request-id"] ?? req.headers["x-amzn-trace-id"];
    const requestId = (Array.isArray(headerId) ? headerId[0] : headerId) ?? randomUUID();
    req.id = requestId;
    req.log = logger.child({ component: "http", requestId });
    res.setHeader("x-request-id", requestId);
    next();
  });

  // Legacy routes
  app.use("/health", healthRouter);

  // v1 routes
  app.use("/cribsearch/v1/health", healthRouter);
  app.use("/cribsearch/v1/journey", journeyRouter);

  // 404 fallback
  app.use((_req: Request, res: Response) => {
    const body: ApiError = { error: "Not Found" };
    res.status(404).json(body);
  });

  // Centralised error handler
  app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    const log: Logger = req.log ?? logger;
    log.error("Unhandled error", { err: serializeError(err) });
    const body: ApiError = { error: "Internal Server Error" };
    res.status(500).json(body);
  });

  return app;
};
