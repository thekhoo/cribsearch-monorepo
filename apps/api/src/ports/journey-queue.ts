import type { JourneySearchMessage } from "@homefinder/shared-types";

export interface JourneyQueue {
  enqueue(msg: JourneySearchMessage): Promise<void>;
}
