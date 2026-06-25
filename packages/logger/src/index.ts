import winston from "winston";

export type { Logger } from "winston";

const { combine, timestamp, errors, json, colorize, printf } = winston.format;

/** Keys whose values must never reach the logs (compared case-insensitively). */
const SENSITIVE_KEYS = new Set([
  "password",
  "token",
  "authorization",
  "apikey",
  "supabaseservicerolekey",
  "supabase_service_role_key",
  "service_role_key",
]);

/** Deep-redacts sensitive keys in place, guarding against circular references. */
const redact = winston.format((info) => {
  const seen = new WeakSet<object>();
  const scrub = (obj: Record<string, unknown>): void => {
    if (seen.has(obj)) return;
    seen.add(obj);
    for (const key of Object.keys(obj)) {
      if (SENSITIVE_KEYS.has(key.toLowerCase())) {
        obj[key] = "[REDACTED]";
        continue;
      }
      const value = obj[key];
      if (value !== null && typeof value === "object") {
        scrub(value as Record<string, unknown>);
      }
    }
  };
  scrub(info as unknown as Record<string, unknown>);
  return info;
});

const isTest = process.env.NODE_ENV === "test";
const isDev = process.env.NODE_ENV === "development";
const logLevel = process.env.LOG_LEVEL ?? "info";

/** Human-friendly, colourised output for local development. */
const devFormat = combine(
  colorize(),
  printf((info) => {
    const { level, message, timestamp: ts, stack, ...meta } = info;
    const detail =
      Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : "";
    return `${ts as string} ${level} ${(stack ?? message) as string}${detail}`;
  }),
);

/** Single-line JSON for CloudWatch / production. */
const prodFormat = combine(redact(), json());

/**
 * Creates a Winston logger. Pass `bindings` to attach persistent structured
 * fields (e.g. `{ component: "worker" }`) to every line it emits. Prefer
 * `logger.child({ ... })` at call sites over creating new loggers.
 */
export const createLogger = (
  bindings: Record<string, unknown> = {},
): winston.Logger =>
  winston.createLogger({
    level: logLevel,
    defaultMeta: bindings,
    format: combine(
      timestamp(),
      errors({ stack: true }),
      isDev ? devFormat : prodFormat,
    ),
    transports: [new winston.transports.Console({ silent: isTest })],
  });

/** Normalises any thrown value into a JSON-serialisable shape. */
export const serializeError = (err: unknown): Record<string, unknown> =>
  err instanceof Error
    ? { name: err.name, message: err.message, stack: err.stack }
    : { message: String(err) };

/** Shared application logger. Use `logger.child({ component })` for context. */
export const logger = createLogger();
