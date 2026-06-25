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

- **SSM paths:** `/production/homefinder/service/supabase/url` (String) and
  `/production/homefinder/service/supabase/service-role-key` (SecureString,
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
