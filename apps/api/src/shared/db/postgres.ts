import { Pool } from "pg";
import { logger } from "@cribsearch/logger";
import { getParametersByPath } from "../aws/ssm";

const log = logger.child({ component: "postgres" });

const SSM_POSTGRES_PATH = "/production/cribsearch/service/postgres/";

export interface PostgresConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  sslmode?: string;
}

/** Builds a Postgres connection URL, URL-encoding user/password/database. */
export const buildPostgresUrl = (c: PostgresConfig): string => {
  const user = encodeURIComponent(c.user);
  const password = encodeURIComponent(c.password);
  const database = encodeURIComponent(c.database);
  const sslmode = c.sslmode ?? "require";
  return `postgresql://${user}:${password}@${c.host}:${c.port}/${database}?sslmode=${sslmode}`;
};

let cachedPostgres: PostgresConfig | null = null;

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
  const params = await getParametersByPath(SSM_POSTGRES_PATH, { decrypt: true });

  if (Object.keys(params).length === 0) {
    throw new Error(`No SSM parameters found under ${SSM_POSTGRES_PATH}`);
  }

  const requireField = (field: string): string => {
    const value = params[field];
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

let pool: Pool | null = null;

export const getPool = async (): Promise<Pool> => {
  if (pool) return pool;
  pool = new Pool({ connectionString: await resolvePostgresUrl(), max: 3 });
  return pool;
};

export const closePool = async (): Promise<void> => {
  if (pool) {
    await pool.end();
    pool = null;
  }
};
