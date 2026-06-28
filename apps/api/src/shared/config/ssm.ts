import {
  SSMClient,
  GetParameterCommand,
  GetParametersByPathCommand,
} from "@aws-sdk/client-ssm";
import { logger } from "@cribsearch/logger";
import { buildPostgresUrl, type PostgresConfig } from "./postgres-url";

const log = logger.child({ component: "ssm" });

const SSM_SUPABASE_URL = "/production/cribsearch/service/supabase/url";
const SSM_SUPABASE_SERVICE_ROLE_KEY =
  "/production/cribsearch/service/supabase/service-role-key";

const SSM_POSTGRES_PATH = "/production/cribsearch/service/postgres/";

export interface SupabaseConfig {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
}

let cached: SupabaseConfig | null = null;
let cachedPostgres: PostgresConfig | null = null;

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

export { type PostgresConfig } from "./postgres-url";

/**
 * Resolves Postgres connection fields. In local dev (when PGHOST is set via
 * .env) the env vars are returned directly. In Lambda the values are fetched
 * from SSM Parameter Store on first call and cached for the process lifetime.
 */
export const resolvePostgresConfig = async (): Promise<PostgresConfig> => {
  if (cachedPostgres) return cachedPostgres;

  const fromEnv = process.env.PGHOST;
  if (fromEnv) {
    log.debug("using Postgres credentials from environment variables");
    cachedPostgres = {
      host: fromEnv,
      port: Number(process.env.PGPORT ?? 5432),
      user: process.env.PGUSER ?? "",
      password: process.env.PGPASSWORD ?? "",
      database: process.env.PGDATABASE ?? "",
      sslmode: process.env.PGSSLMODE ?? "disable",
    };
    return cachedPostgres;
  }

  log.info("fetching Postgres credentials from SSM");
  const client = new SSMClient({});
  const { Parameters } = await client.send(
    new GetParametersByPathCommand({
      Path: SSM_POSTGRES_PATH,
      WithDecryption: true,
    }),
  );

  if (!Parameters || Parameters.length === 0) {
    throw new Error(
      `No SSM parameters found under ${SSM_POSTGRES_PATH}`,
    );
  }

  const paramMap = new Map(
    Parameters.map((p) => {
      const key = p.Name?.split("/").pop() ?? "";
      return [key, p.Value ?? ""] as const;
    }),
  );

  const requireField = (field: string): string => {
    const value = paramMap.get(field);
    if (value === undefined || value === "") {
      throw new Error(
        `SSM parameter ${SSM_POSTGRES_PATH}${field} is empty or missing`,
      );
    }
    return value;
  };

  cachedPostgres = {
    host: requireField("host"),
    port: Number(requireField("port")),
    user: requireField("user"),
    password: requireField("password"),
    database: requireField("database"),
  };
  return cachedPostgres;
};

/** Resolves the full Postgres connection URL (assembled from individual fields). */
export const resolvePostgresUrl = async (): Promise<string> =>
  buildPostgresUrl(await resolvePostgresConfig());
