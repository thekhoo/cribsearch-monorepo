import { env } from "./shared/config/env";
import type { JourneyRequestRepository } from "./ports/journey-request-repository";
import type { JourneyQueue } from "./ports/journey-queue";
import type { MapsProvider } from "./shared/maps/maps-provider";
import { InMemoryJourneyRepository } from "./adapters/in-memory-journey-repository";
import { InProcessJourneyQueue } from "./adapters/in-process-journey-queue";
import { SqsJourneyQueue } from "./adapters/sqs-journey-queue";
import { StubMapsProvider } from "./shared/maps/stub-maps-provider";

export interface Ports {
  repo: JourneyRequestRepository;
  queue: JourneyQueue;
  maps: MapsProvider;
}

const buildPorts = (): Ports => {
  const repo = new InMemoryJourneyRepository();
  const maps = new StubMapsProvider();

  const queue = env.journeyQueueUrl
    ? new SqsJourneyQueue(env.journeyQueueUrl)
    : new InProcessJourneyQueue(repo, maps);

  return { repo, queue, maps };
};

export const ports: Ports = buildPorts();
