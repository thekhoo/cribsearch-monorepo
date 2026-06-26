# 7. Per-universe databases on a single Supabase project (raw pg)

- Status: Accepted
- Date: 2026-06-25

## Context

Cribsearch deploys to multiple universes (development, staging, production). Each
universe needs its own database with strong credential isolation so that a leaked
staging secret cannot reach production data.

Two approaches were considered:

- **Separate Supabase projects per universe.** Gives full isolation (compute,
  storage, credentials) but costs ~$25/project/month on the Pro plan, tripling
  the bill for three universes.
- **One Supabase project, one Postgres database per universe.** A single project
  keeps costs flat, and per-database roles restore credential isolation. The
  trade-off is shared compute/connection limits and loss of Supabase-managed
  features (PostgREST, Studio, Auth) for the non-default databases.

## Decision

Use **one Supabase project** with a separate Postgres **database per universe**:

| Universe    | Database                 | Admin (DDL / migrations)       | Read-write (app DML)          | Read-only                     |
| ----------- | ------------------------ | ------------------------------ | ----------------------------- | ----------------------------- |
| development | `development_cribsearch` | `development_cribsearch_admin` | `development_cribsearch_rw`   | `development_cribsearch_ro`   |
| staging     | `staging_cribsearch`     | `staging_cribsearch_admin`     | `staging_cribsearch_rw`       | `staging_cribsearch_ro`       |
| production  | `production_cribsearch`  | `production_cribsearch_admin`  | `production_cribsearch_rw`    | `production_cribsearch_ro`    |

Key design points:

1. **Raw `pg` driver.** Hosted Supabase's PostgREST and Studio only reach the
   default `postgres` database. The extra per-universe databases are reachable
   only via a direct Postgres connection, so the API uses the `pg` (node-postgres)
   driver — not `@supabase/supabase-js`. Runtime `pg` wiring is deferred to a
   later iteration; this iteration is infra-only.
2. **Per-universe least-privilege roles (admin / rw / ro).** Each universe gets
   three roles: `*_admin` owns the schema and runs migrations (DDL); `*_rw` is
   the application runtime role (DML only); `*_ro` is for read-only consumers.
   Each role can only connect to its own universe's database. A compromised
   staging credential cannot connect to or query the production database.
3. **Connection strings in SSM.** Each universe stores its Postgres connection
   string at `/{universe}/cribsearch/service/postgres/connection-string`
   (SecureString). See [ADR 0005](0005-ssm-secrets.md).
4. **Local dev uses Docker.** A vanilla Postgres 16 container (`docker-compose.yml`
   at repo root) provides `local_cribsearch`. The cloud `development_cribsearch`
   database is reserved for the deployed development universe.

## Consequences

- `@supabase/supabase-js` and PostgREST are not used for database access on the
  per-universe databases. Supabase Studio cannot browse them either. Direct SQL
  or a local client (e.g. psql, pgAdmin) must be used for ad-hoc queries.
- All three universes share one Supabase project's compute and connection pool.
  Under high load this could become a bottleneck, but current traffic is low.
- A one-time bootstrap step (`apps/api/db/bootstrap.sql`) must be run as the
  Supabase superuser to create the databases and roles. Placeholder passwords in
  that script must be replaced with real secrets before execution.
- Per-universe credential isolation is restored despite the single-project
  design, because each role is scoped to a single database.

## Revisit if

- The cost of separate Supabase projects becomes acceptable (e.g. the product
  generates enough revenue to justify ~$75/month for three Pro projects), or
- we need PostgREST, Studio, or Supabase Auth features on the per-universe
  databases, or
- shared compute/connection limits become a bottleneck under production load.

## Update — 2026-06-26 (migrated to Neon)

The database host has moved from **Supabase** to **Neon** (https://neon.tech).
The architectural topology is unchanged: one project with one database per
universe, plus the admin/rw/ro role structure.

**What changed:**

- The managed Postgres provider is now Neon. Bootstrap (`bootstrap.sql`) should
  be run as the Neon default/owner role (`neondb_owner`), not the Supabase
  `postgres` superuser. Neon's elevated managed role is `neon_superuser`; roles
  created via the Neon Console/API join it, while SQL-created roles do not.
- For Lambda/app connections, use Neon's **pooled** endpoint (the `-pooler`
  host).

**What no longer applies from the original rationale:**

- The IPv6-only direct endpoint issue was Supabase-specific; Neon endpoints are
  IPv4-reachable.
- The Supabase pooler limitation (pinned to the default `postgres` database) does
  not exist on Neon.
- The concern about PostgREST/Studio not reaching non-default databases was
  Supabase-specific; Neon does not bundle PostgREST or Studio.

**Worth revisiting:** since Neon's free tier allows multiple projects,
**one-project-per-universe** is now a cheap alternative worth considering if
stronger isolation (separate compute, separate credentials namespace) is wanted.
The current single-project topology remains acceptable for now.
