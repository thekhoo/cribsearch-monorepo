import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import type { JourneySearchMessage } from "@homefinder/shared-types";
import { logger } from "@homefinder/logger";
import type { JourneyQueue } from "../ports/journey-queue";

const log = logger.child({ component: "sqs-queue" });

export class SqsJourneyQueue implements JourneyQueue {
  private readonly client: SQSClient;

  constructor(private readonly queueUrl: string) {
    this.client = new SQSClient({});
  }

  async enqueue(msg: JourneySearchMessage): Promise<void> {
    await this.client.send(
      new SendMessageCommand({
        QueueUrl: this.queueUrl,
        MessageBody: JSON.stringify(msg),
      }),
    );
    log.info("enqueued request", { journeyRequestId: msg.journeyRequestId });
  }
}
