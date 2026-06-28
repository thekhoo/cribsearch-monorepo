/**
 * Centralised environment access. Values are read lazily by consumers so the
 * process can boot (e.g. for local tooling) even when optional vars are unset.
 */

import { logger } from "@cribsearch/logger";

/**
 * Parses a comma-separated CORS allowed origins string.
 *
 * Fails closed in production: when `raw` is unset or parses to an empty list
 * and `nodeEnv` is `"production"`, returns `[]` so all cross-origin requests
 * are denied. In other environments, falls back to `["http://localhost:3000"]`.
 */
export function parseAllowedOrigins(raw: string | undefined, nodeEnv: string): string[] {
  const parsed = raw
    ? raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  if (parsed.length > 0) return parsed;

  if (nodeEnv === "production") {
    logger.warn(
      "CORS_ALLOWED_ORIGINS is not set in production; all cross-origin requests will be denied",
    );
    return [];
  }

  return ["http://localhost:3000"];
}

const nodeEnv = process.env.NODE_ENV ?? "development";

export const env = {
  nodeEnv,
  port: Number(process.env.PORT ?? 3001),
  journeyQueueUrl: process.env.JOURNEY_QUEUE_URL ?? "",
  logLevel: process.env.LOG_LEVEL ?? "info",
  /**
   * Comma-separated list of allowed CORS origins.
   * In non-production environments, defaults to the Next.js dev origin when
   * CORS_ALLOWED_ORIGINS is unset. In production, fails closed: if the var is
   * unset or empty, returns [] so all cross-origin requests are denied.
   */
  corsAllowedOrigins: parseAllowedOrigins(process.env.CORS_ALLOWED_ORIGINS, nodeEnv),
};
