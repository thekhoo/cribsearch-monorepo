import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import type { ApiError } from "@homefinder/shared-types";
import { healthRouter } from "./routes/health";
import { propertiesRouter } from "./routes/properties";
import { createJourneyRouter } from "./routes/journey";
import type { Ports } from "./composition";

export const createApp = (ports?: Ports): Express => {
  const app = express();

  app.use(express.json());

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
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Unhandled error:", err);
    const body: ApiError = { error: "Internal Server Error" };
    res.status(500).json(body);
  });

  return app;
};
