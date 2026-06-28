import {
  SSMClient,
  GetParameterCommand,
  GetParametersByPathCommand,
} from "@aws-sdk/client-ssm";

let client: SSMClient | null = null;

const getClient = (): SSMClient => (client ??= new SSMClient({}));

interface SsmOptions {
  /** Decrypt SecureString values. Defaults to false. */
  decrypt?: boolean;
}

/** Fetches a single SSM parameter value. Throws if it is empty or missing. */
export const getParameter = async (
  name: string,
  { decrypt = false }: SsmOptions = {},
): Promise<string> => {
  const { Parameter } = await getClient().send(
    new GetParameterCommand({ Name: name, WithDecryption: decrypt }),
  );
  if (!Parameter?.Value) {
    throw new Error(`SSM parameter ${name} is empty or missing`);
  }
  return Parameter.Value;
};

/**
 * Fetches every SSM parameter under `path`, returning a map whose keys are
 * relative to `path` (the path prefix, including a trailing slash, is stripped).
 * Follows pagination. Returns an empty map if nothing is found — callers decide
 * whether absence is an error.
 */
export const getParametersByPath = async (
  path: string,
  { decrypt = false }: SsmOptions = {},
): Promise<Record<string, string>> => {
  const prefix = path.endsWith("/") ? path : `${path}/`;
  const result: Record<string, string> = {};

  let nextToken: string | undefined;
  do {
    const page = await getClient().send(
      new GetParametersByPathCommand({
        Path: path,
        Recursive: true,
        WithDecryption: decrypt,
        NextToken: nextToken,
      }),
    );

    for (const param of page.Parameters ?? []) {
      if (!param.Name) continue;
      const key = param.Name.startsWith(prefix)
        ? param.Name.slice(prefix.length)
        : param.Name;
      result[key] = param.Value ?? "";
    }

    nextToken = page.NextToken;
  } while (nextToken);

  return result;
};
