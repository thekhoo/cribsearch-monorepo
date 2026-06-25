import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { randomUUID } from "node:crypto";
import { logger, serializeError, type Logger } from "@homefinder/logger";
import type { ApiError } from "@homefinder/shared-types";
import { healthRouter } from "./routes/health";
import { propertiesRouter } from "./routes/properties";
import { createJourneyRouter } from "./routes/journey";
import type { Ports } from "./composition";

export const createApp = (ports?: Ports): Express => {
  const app = express();

  app.use(express.json());

  // Attach a request-scoped logger with a correlation id.
  app.use((req, res, next) => {
    const headerId =
      req.headers["x-request-id"] ?? req.headers["x-amzn-trace-id"];
    const requestId =
      (Array.isArray(headerId) ? headerId[0] : headerId) ?? randomUUID();
    req.id = requestId;
    req.log = logger.child({ component: "http", requestId });
    res.setHeader("x-request-id", requestId);
    next();
  });

  // Legacy routes
  app.use("/health", healthRouter);
  app.use("/properties", propertiesRouter);

  // v1 routes
  app.use("/homefinder/v1/health", healthRouter);
  if (ports) {
    app.use("/homefinder/v1/journey", createJourneyRouter(ports));
  }

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
