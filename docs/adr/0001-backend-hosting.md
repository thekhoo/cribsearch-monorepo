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
- Infrastructure is defined with AWS SAM (`apps/api/template.yaml`).
- We run/pay for AWS Lambda + API Gateway in addition to Supabase. Supabase's
  free tier covers the database (500 MB/project) for early development; note
  free projects pause after ~7 days idle, so a paid plan is needed for an
  always-on production database.
- We do **not** use Supabase's auto REST API or Edge Functions for application
  logic. Supabase Auth/Storage remain available if adopted later.

## Revisit if

- Operational cost/complexity of AWS outweighs the control it provides, or
- backend logic stays thin enough that PostgREST + Edge Functions would suffice.
