# 4. Structured logging via @homefinder/logger (Winston)

- Status: Accepted
- Date: 2026-06-25

## Context

The API runs in three contexts: the local Express dev server, an API Gateway
Lambda (HTTP), and an SQS worker Lambda. Previously all logging was ad-hoc
`console.*` calls with string interpolation — no queryable fields, no
correlation ids, and no control over log levels. CloudWatch Logs Insights
requires structured (JSON) log lines to be useful.

## Decision

Introduce a shared workspace package `@homefinder/logger` that wraps Winston
and is consumed by `apps/api`. The logger:

- Emits **single-line JSON to stdout** via `winston.format.json()` in all
  environments except `NODE_ENV=development`, which uses a colorized
  human-readable format.
- Reads **`LOG_LEVEL`** from the environment (default `info`). Under
  `NODE_ENV=test` the Console transport is **silent** so tests are not noisy.
- Provides **correlation**: HTTP requests get a `requestId` child logger via
  middleware (sourced from `x-request-id` / `x-amzn-trace-id`, falling back to
  a UUID). The async pipeline correlates on `journeyRequestId`.
- **Deep-redacts** sensitive keys (`password`, `token`, `authorization`,
  `apiKey`, `supabaseServiceRoleKey`, etc.) before serialising.

## Consequences

- Every log line is a JSON object with `level`, `message`, `timestamp`, and
  structured metadata — directly queryable in CloudWatch Logs Insights.
- `LOG_LEVEL` gives per-environment verbosity control without code changes.
- Local development retains readable, colorized output.
- Correlation ids make it possible to trace a single HTTP request or async job
  across all log lines it produces.
- Secrets are scrubbed from logs even if accidentally passed as metadata.
- Tests run silently by default (no console noise in CI output).

## Revisit if

- A different log aggregation backend requires a format other than JSON, or
- the project adopts OpenTelemetry and logging moves to the OTel SDK.
