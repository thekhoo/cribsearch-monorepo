/**
 * Centralised environment access. Values are read lazily by consumers so the
 * process can boot (e.g. for local tooling) even when optional vars are unset.
 */
export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 3001),
  supabaseUrl: process.env.SUPABASE_URL ?? "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  journeyQueueUrl: process.env.JOURNEY_QUEUE_URL ?? "",
  logLevel: process.env.LOG_LEVEL ?? "info",
} as const;
