import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import type { ApiError } from "@homefinder/shared-types";
import { healthRouter } from "./routes/health";
import { propertiesRouter } from "./routes/properties";

/** Builds the Express app. Shared by the local server and the Lambda handler. */
export const createApp = (): Express => {
  const app = express();

  app.use(express.json());

  app.use("/health", healthRouter);
  app.use("/properties", propertiesRouter);

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
