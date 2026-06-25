import type {
  SQSBatchItemFailure,
  SQSBatchResponse,
  SQSHandler,
} from "aws-lambda";
import type { JourneySearchMessage } from "@cribsearch/shared-types";
import { logger, serializeError } from "@cribsearch/logger";
import { ports } from "./composition";
import { processJourneyRequest } from "./services/process-journey-request";

const log = logger.child({ component: "worker" });
// Supabase init deferred — see ADR 0005 (repo is currently in-memory).

export const handler: SQSHandler = async (event) => {
  const failures: SQSBatchItemFailure[] = [];

  for (const record of event.Records) {
    try {
      const msg = JSON.parse(record.body) as JourneySearchMessage;
      log.info("processing message", {
        journeyRequestId: msg.journeyRequestId,
      });
      await processJourneyRequest(msg, {
        repo: ports.repo,
        maps: ports.maps,
      });
    } catch (err) {
      log.error("failed to process record", {
        messageId: record.messageId,
        err: serializeError(err),
      });
      failures.push({ itemIdentifier: record.messageId });
    }
  }

  const response: SQSBatchResponse = { batchItemFailures: failures };
  return response;
};
