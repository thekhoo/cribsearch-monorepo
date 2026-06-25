import type { JourneySearchMessage } from "@cribsearch/shared-types";
import { logger } from "@cribsearch/logger";
import type { JourneyQueue } from "../ports/journey-queue";
import type { JourneyRequestRepository } from "../ports/journey-request-repository";
import type { MapsProvider } from "../ports/maps-provider";
import { processJourneyRequest } from "../services/process-journey-request";

const log = logger.child({ component: "in-process-queue" });

export class InProcessJourneyQueue implements JourneyQueue {
  private lastEnqueue: Promise<void> = Promise.resolve();

  constructor(
    private readonly repo: JourneyRequestRepository,
    private readonly maps: MapsProvider,
  ) {}

  async enqueue(msg: JourneySearchMessage): Promise<void> {
    this.lastEnqueue = this.process(msg);
    await this.lastEnqueue;
  }

  async drain(): Promise<void> {
    await this.lastEnqueue;
  }

  private async process(msg: JourneySearchMessage): Promise<void> {
    try {
      await processJourneyRequest(msg, {
        repo: this.repo,
        maps: this.maps,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      log.warn("swallowed error (simulates SQS retry)", { reason: message });
    }
  }
}
