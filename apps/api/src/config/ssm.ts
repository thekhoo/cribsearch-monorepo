import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";
import { logger } from "@homefinder/logger";

const log = logger.child({ component: "ssm" });

const SSM_SUPABASE_URL = "/production/homefinder/service/supabase/url";
const SSM_SUPABASE_SERVICE_ROLE_KEY =
  "/production/homefinder/service/supabase/service-role-key";

export interface SupabaseConfig {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
}

let cached: SupabaseConfig | null = null;

const getParameter = async (
  client: SSMClient,
  name: string,
  decrypt: boolean,
): Promise<string> => {
  const { Parameter } = await client.send(
    new GetParameterCommand({ Name: name, WithDecryption: decrypt }),
  );
  if (!Parameter?.Value) {
    throw new Error(`SSM parameter ${name} is empty or missing`);
  }
  return Parameter.Value;
};

/**
 * Resolves Supabase credentials. In local dev (when SUPABASE_URL is set via
 * .env) the env vars are returned directly. In Lambda the values are fetched
 * from SSM Parameter Store on first call and cached for the process lifetime.
 */
export const resolveSupabaseConfig = async (): Promise<SupabaseConfig> => {
  if (cached) return cached;

  const fromEnv = process.env.SUPABASE_URL;
  if (fromEnv) {
    log.debug("using Supabase credentials from environment variables");
    cached = {
      supabaseUrl: fromEnv,
      supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    };
    return cached;
  }

  log.info("fetching Supabase credentials from SSM");
  const client = new SSMClient({});
  const [supabaseUrl, supabaseServiceRoleKey] = await Promise.all([
    getParameter(client, SSM_SUPABASE_URL, false),
    getParameter(client, SSM_SUPABASE_SERVICE_ROLE_KEY, true),
  ]);

  cached = { supabaseUrl, supabaseServiceRoleKey };
  return cached;
};
