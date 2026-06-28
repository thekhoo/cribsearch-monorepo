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
  const sslmode = c.sslmode ?? "verify-full";
  return `postgresql://${user}:${password}@${c.host}:${c.port}/${database}?sslmode=${sslmode}`;
};
