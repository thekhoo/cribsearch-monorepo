import type { Logger } from "@homefinder/logger";

declare global {
  namespace Express {
    interface Request {
      id: string;
      log: Logger;
    }
  }
}

export {};
