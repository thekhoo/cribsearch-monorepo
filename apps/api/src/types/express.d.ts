import type { Logger } from "@cribsearch/logger";

declare global {
  namespace Express {
    interface Request {
      id: string;
      log: Logger;
      userId?: string;
    }
  }
}

export {};
