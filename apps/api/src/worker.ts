import type {
  SQSBatchItemFailure,
  SQSBatchResponse,
  SQSHandler,
} from "aws-lambda";
import type { SearchMessage } from "@cribsearch/shared-types";
import { logger, serializeError } from "@cribsearch/logger";
import { processSearchRequest } from "./features/searches/service/process-search-request";

const log = logger.child({ component: "worker" });

export const handler: SQSHandler = async (event) => {
  const failures: SQSBatchItemFailure[] = [];

  for (const record of event.Records) {
    try {
      const msg = JSON.parse(record.body) as SearchMessage;
      log.info("processing message", {
        searchRequestId: msg.searchRequestId,
      });
      await processSearchRequest(msg);
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
