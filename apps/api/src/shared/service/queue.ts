import type { SearchMessage } from "@cribsearch/shared-types";
import { logger } from "@cribsearch/logger";
import { env } from "../config/env";
import { sendMessage } from "../aws/sqs";

const log = logger.child({ component: "sqs-queue" });

/** Enqueues a search message onto the SQS search queue. */
export const enqueueSearch = async (msg: SearchMessage): Promise<void> => {
  if (!env.searchQueueUrl) {
    log.warn("SEARCH_QUEUE_URL not set; skipping enqueue", {
      searchRequestId: msg.searchRequestId,
    });
    return;
  }
  await sendMessage(env.searchQueueUrl, JSON.stringify(msg));
  log.info("enqueued request", { searchRequestId: msg.searchRequestId });
};
