# 5. Supabase credentials via SSM Parameter Store

- Status: Accepted
- Date: 2026-06-25

## Context

The API needs Supabase credentials (project URL and service-role key). Previously
these were passed as CloudFormation parameters and injected as Lambda environment
variables, meaning the secret appeared in the CloudFormation template, the Lambda
console, and `sam deploy` command lines.

## Decision

Fetch Supabase credentials at runtime from **AWS Systems Manager (SSM) Parameter
Store** instead of passing them as stack parameters or environment variables.

- **SSM paths:** `/production/cribsearch/service/supabase/url` (String) and
  `/production/cribsearch/service/supabase/service-role-key` (SecureString,
  encrypted with the default `aws/ssm` KMS key).
- **Cold-start init:** each Lambda entry point (`handler.ts`, `worker.ts`) calls
  `initSupabase()` during init (outside the handler). The SSM fetch happens once
  per cold start and the client is cached for the process lifetime.
- **Local dev:** when `SUPABASE_URL` is present in the environment (via `.env`),
  the SSM fetch is skipped and the env vars are used directly.

## Consequences

- Secrets no longer appear in CloudFormation parameters, environment variables,
  or deploy command lines.
- The SAM template no longer has `SupabaseUrl` / `SupabaseServiceRoleKey`
  parameters. Both Lambda functions have `SSMParameterReadPolicy` and
  `KMSDecryptPolicy` instead.
- SSM parameters must be provisioned before the first deploy (see README).
- Cold-start latency increases slightly (one SSM `GetParameter` call, ~50 ms in
  the same region). Warm invocations pay no extra cost.
- Local dev workflow is unchanged — credentials still come from `.env`.

## Revisit if

- We adopt AWS Secrets Manager (e.g. for automatic rotation), or
- the number of secrets grows and a bulk-fetch approach (e.g. SSM
  `GetParametersByPath`) becomes more efficient.

## Update — 2026-06-25 (init deferral)

Eager cold-start `initSupabase()` was removed from the Lambda/server entry
points: with the repository still in-memory, nothing consumes the Supabase
client yet, and initialising it against placeholder SSM values crashed every
route (including `/health`). The SSM machinery (`config/ssm.ts`, `db/supabase.ts`)
remains; init will be reintroduced — ideally lazily, on first real use — when a
Supabase-backed adapter is added. The only current `getSupabase()` consumer is
the legacy `/properties` placeholder route, which will error if called until then.

## Update — 2026-06-25 (per-universe connection string)

With the move to per-universe databases on a single Supabase project
(see [ADR 0007](0007-per-universe-databases.md)), the SSM credential shape for
the database changes. Instead of a PostgREST `url` + `service-role-key` pair,
each universe stores a single Postgres **connection string** suitable for the
`pg` driver:

- **Path:** `/{universe}/cribsearch/service/postgres/connection-string`
  (SecureString, encrypted with the default `aws/ssm` KMS key)

This parameter is the **single source of truth** for both:

1. the CICD `migrate` job (Atlas reads it to run migrations before deploy), and
2. the future Lambda runtime (the `pg` client will read it at cold start).

The deployment role
(`arn:aws:iam::020844256789:role/github-actions-thekhoo-cribsearch-monorepo-deployment`)
needs `ssm:GetParameter` permission on the new path. This role lives outside
this repo and must be updated out of band.

The existing Supabase SSM parameters (`supabase/url`, `supabase/service-role-key`)
remain for now but are no longer the primary database credential path.

## Update — 2026-06-25 (per-field Postgres parameters)

The Postgres credential is now stored as **individual SSM fields** under
`/{universe}/cribsearch/service/postgres/`:

- `host` (String)
- `port` (String)
- `user` (String)
- `database` (String)
- `password` (SecureString)

The connection URL is assembled in code (`buildPostgresUrl` in
`config/postgres-url.ts`) and in the CI migrate job using `jq`'s `@uri` filter.
This approach ensures the password is URL-encoded reliably, even when it
contains special characters (`@ / : ? #` etc.).

This supersedes the single `connection-string` parameter from the prior update.
The deployment role needs `ssm:GetParameter` and `ssm:GetParametersByPath`
permission on the new paths.

## Update — 2026-06-26 (migrated to Neon)

The Postgres SSM parameters under `/{universe}/cribsearch/service/postgres/*`
now point at **Neon** instead of Supabase:

- **`host`** is the Neon **pooled** endpoint (the `-pooler` variant,
  e.g. `ep-xxxx-pooler.<region>.aws.neon.tech`) for Lambda/app runtime use.
- `port`, `user`, `database`, and `password` remain structurally the same.

The legacy Supabase SSM parameters (`/{universe}/cribsearch/service/supabase/url`
and `supabase/service-role-key`) are **deprecated** and should be removed once
all references are confirmed cleared. They are no longer read by any deployed
code or CI pipeline.
