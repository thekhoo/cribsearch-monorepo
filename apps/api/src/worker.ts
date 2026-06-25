import type {
  SQSBatchItemFailure,
  SQSBatchResponse,
  SQSHandler,
} from "aws-lambda";
import type { JourneySearchMessage } from "@homefinder/shared-types";
import { ports } from "./composition";
import { processJourneyRequest } from "./services/process-journey-request";

export const handler: SQSHandler = async (event) => {
  const failures: SQSBatchItemFailure[] = [];

  for (const record of event.Records) {
    try {
      const msg = JSON.parse(record.body) as JourneySearchMessage;
      console.info(`[worker] processing message for request ${msg.journeyRequestId}`);
      await processJourneyRequest(msg, {
        repo: ports.repo,
        maps: ports.maps,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[worker] failed to process record ${record.messageId}: ${message}`);
      failures.push({ itemIdentifier: record.messageId });
    }
  }

  const response: SQSBatchResponse = { batchItemFailures: failures };
  return response;
};
