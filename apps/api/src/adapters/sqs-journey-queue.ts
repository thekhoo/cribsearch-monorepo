import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import type { JourneySearchMessage } from "@homefinder/shared-types";
import type { JourneyQueue } from "../ports/journey-queue";

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
    console.info(`[SqsJourneyQueue] enqueued request ${msg.journeyRequestId}`);
  }
}
