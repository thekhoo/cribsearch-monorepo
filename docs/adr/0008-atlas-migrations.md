# 8. Atlas for schema migrations

- Status: Accepted
- Date: 2026-06-25

## Context

With per-universe databases (see [ADR 0007](0007-per-universe-databases.md)), the
project needs a migration tool that can:

- produce **reviewable, versioned SQL migrations** checked into the repo,
- apply those migrations to multiple per-universe databases from a Node-centric CI
  pipeline (no JVM or heavy runtime),
- validate and lint migration files on pull requests before merge.

## Decision

Use **Atlas** (ariga.io/atlas) for schema migrations.

- **Migration files:** `apps/api/migrations/` (versioned SQL, one directory per
  migration).
- **Configuration:** `apps/api/atlas.hcl`, parameterised by environment.
- **Dev database:** an ephemeral `docker://postgres/16/dev` scratch container,
  used by Atlas for diffing, validating, and linting migrations locally and in CI.
- **Checksum file:** `apps/api/migrations/atlas.sum` ensures migration integrity.
  It must be regenerated with Atlas (`pnpm --filter @cribsearch/api db:migrate:hash`)
  and committed whenever migrations change.

### Alternatives considered

| Tool         | Why rejected                                                      |
| ------------ | ----------------------------------------------------------------- |
| **Flyway**   | Requires a JVM — heavy dependency in a Node/TypeScript toolchain. |
| **Supabase CLI** | Built around the default `postgres` database and PostgREST. Fights the multi-database design where per-universe databases are not reachable via Supabase's managed layer. |
| **Prisma**   | Full ORM with its own query builder. Adopting it would reverse the raw-`pg` decision and couple the data layer to Prisma's abstractions. |

Atlas is SQL-first, ships as a single Go binary (no JVM), supports per-environment
configuration, and integrates cleanly with GitHub Actions via `ariga/setup-atlas`.

## Consequences

- The Atlas binary must be available in CI. GitHub Actions workflows use
  `ariga/setup-atlas` to install it.
- `atlas.sum` must stay in sync with the migration directory. If a migration file
  is added or modified, `db:migrate:hash` must be re-run and the updated
  `atlas.sum` committed alongside the migration.
- A `migrate` job in `.github/workflows/deploy.yml` runs `atlas migrate apply`
  against the target database **before** the `deploy-api` job, ensuring the
  schema is up to date before new code is deployed. Only `production` is wired
  today.
- `.github/workflows/ci.yml` runs `atlas migrate validate` and `atlas migrate lint`
  on pull requests to catch migration issues before merge.
- Local development uses the same Atlas CLI and migration files, with the
  connection string pointing at the Docker Compose Postgres
  (`cribsearch_local`).

## Revisit if

- We adopt an ORM (e.g. Prisma, Drizzle) with its own migration system at the
  runtime wiring iteration, or
- Atlas pricing or licensing changes in a way that affects the project.
