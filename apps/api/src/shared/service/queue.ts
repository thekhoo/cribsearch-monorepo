import type { JourneySearchMessage } from "@cribsearch/shared-types";
import { logger } from "@cribsearch/logger";
import { env } from "../config/env";
import { sendMessage } from "../aws/sqs";

const log = logger.child({ component: "sqs-queue" });

/** Enqueues a journey search message onto the SQS journey queue. */
export const enqueueJourney = async (msg: JourneySearchMessage): Promise<void> => {
  if (!env.journeyQueueUrl) {
    log.warn("JOURNEY_QUEUE_URL not set; skipping enqueue", {
      journeyRequestId: msg.journeyRequestId,
    });
    return;
  }
  await sendMessage(env.journeyQueueUrl, JSON.stringify(msg));
  log.info("enqueued request", { journeyRequestId: msg.journeyRequestId });
};
