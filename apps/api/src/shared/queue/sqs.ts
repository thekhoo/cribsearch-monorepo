import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import type { JourneySearchMessage } from "@cribsearch/shared-types";
import { logger } from "@cribsearch/logger";
import { env } from "../config/env";

const log = logger.child({ component: "sqs-queue" });
let client: SQSClient | null = null;

export const enqueueJourney = async (msg: JourneySearchMessage): Promise<void> => {
  if (!env.journeyQueueUrl) {
    log.warn("JOURNEY_QUEUE_URL not set; skipping enqueue", {
      journeyRequestId: msg.journeyRequestId,
    });
    return;
  }
  client ??= new SQSClient({});
  await client.send(
    new SendMessageCommand({
      QueueUrl: env.journeyQueueUrl,
      MessageBody: JSON.stringify(msg),
    }),
  );
  log.info("enqueued request", { journeyRequestId: msg.journeyRequestId });
};
