/**
 * Centralised environment access. Values are read lazily by consumers so the
 * process can boot (e.g. for local tooling) even when optional vars are unset.
 */

function parseAllowedOrigins(raw: string | undefined): string[] {
  if (!raw) return ["http://localhost:3000"];
  const parsed = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return parsed.length > 0 ? parsed : ["http://localhost:3000"];
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 3001),
  journeyQueueUrl: process.env.JOURNEY_QUEUE_URL ?? "",
  logLevel: process.env.LOG_LEVEL ?? "info",
  /** Comma-separated list of allowed CORS origins. Defaults to the Next.js dev origin. */
  corsAllowedOrigins: parseAllowedOrigins(process.env.CORS_ALLOWED_ORIGINS),
};
