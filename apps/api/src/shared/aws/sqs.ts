import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";

let client: SQSClient | null = null;

const getClient = (): SQSClient => (client ??= new SQSClient({}));

/** Sends a message to an SQS queue. */
export const sendMessage = async (
  queueUrl: string,
  messageBody: string,
): Promise<void> => {
  await getClient().send(
    new SendMessageCommand({ QueueUrl: queueUrl, MessageBody: messageBody }),
  );
};
