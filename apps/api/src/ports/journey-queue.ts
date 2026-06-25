import type { JourneySearchMessage } from "@cribsearch/shared-types";

export interface JourneyQueue {
  enqueue(msg: JourneySearchMessage): Promise<void>;
}
