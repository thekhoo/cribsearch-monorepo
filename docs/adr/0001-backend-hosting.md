# 1. Backend hosting: AWS Lambda + Supabase-as-database

- Status: Accepted
- Date: 2026-06-24

## Context

The Cribsearch backend needs an HTTP API and a Postgres database. Two viable
paths were considered:

- **Path A — Custom API on AWS:** an Express app deployed to AWS Lambda behind
  API Gateway (via `serverless-http`, packaged with AWS SAM), using Supabase
  purely as the managed Postgres database.
- **Path B — Supabase-native:** drop AWS and use Supabase's auto-generated REST
  API (PostgREST) plus Edge Functions (Deno) for custom logic.

Path B is cheaper and lower-ops, but couples backend code to the
Supabase/Edge-Function runtime and offers less control over the request
lifecycle.

## Decision

Use **Path A**: Express on AWS Lambda + API Gateway, with **Supabase as the
Postgres database only** (accessed server-side via `@supabase/supabase-js` with
the service-role key).

## Consequences

- Backend logic is a standard Express app (`apps/api/src/app.ts`), reused by
  both the local dev server and the Lambda handler — portable off Supabase if
  needed.
- Infrastructure is defined with AWS SAM (`infrastructure/stack/template.yaml`).
- We run/pay for AWS Lambda + API Gateway in addition to Supabase. Supabase's
  free tier covers the database (500 MB/project) for early development; note
  free projects pause after ~7 days idle, so a paid plan is needed for an
  always-on production database.
- We do **not** use Supabase's auto REST API or Edge Functions for application
  logic. Supabase Auth/Storage remain available if adopted later.

## Revisit if

- Operational cost/complexity of AWS outweighs the control it provides, or
- backend logic stays thin enough that PostgREST + Edge Functions would suffice.

## Update — 2026-06-25

The database remains Supabase Postgres, but the access path has changed: the API
now connects via the raw **`pg`** (node-postgres) driver instead of
`@supabase/supabase-js`. This is driven by the per-universe multi-database design
(see [ADR 0007](0007-per-universe-databases.md)): each deployment stage gets its
own Postgres database on a single Supabase project, and hosted Supabase's
PostgREST / Studio only reach the default `postgres` database — the extra
per-universe databases are reachable only via a direct Postgres connection.

The Path A vs Path B decision (Express on AWS Lambda) is unchanged.

## Update — 2026-06-26 (migrated to Neon)

The managed Postgres host has moved from **Supabase** to **Neon**
(https://neon.tech). The data access layer is unchanged: vanilla Postgres via the
raw `pg` (node-postgres) driver, with Atlas migrations.

**Reason for the switch:** Supabase's direct Postgres endpoint is IPv6-only
(unless the paid IPv4 add-on is purchased). This broke connectivity from AWS
Lambda and GitHub Actions CI runners, which operate on IPv4-only networks. Neon
provides an IPv4-reachable, serverless-friendly Postgres endpoint out of the box.

The Path A decision (Express on AWS Lambda) remains unchanged.
