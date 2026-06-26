# Cribsearch Monorepo

A monorepo containing the Cribsearch web frontend and backend API.

| Workspace                  | Stack                                  | Deploys to            |
| -------------------------- | -------------------------------------- | --------------------- |
| `apps/web`                 | Next.js 15 (App Router) + Tailwind v4  | Vercel                |
| `apps/api`                 | Express on Lambda (`serverless-http`)  | AWS (Lambda + API GW) |
| `packages/shared-types`    | TypeScript types shared web ↔ api      | —                     |
| `packages/logger`          | Shared Winston logger (JSON + dev)     | —                     |

- **Package manager / orchestration:** pnpm workspaces + [Turborepo](https://turbo.build)
- **Data layer:** Neon (Postgres) via raw `pg` (node-postgres) driver + Atlas migrations (runtime `pg` wiring is forthcoming)
- **Infra-as-code:** AWS SAM (`apps/api/template.yaml`)

> Architecture decisions are recorded in [`docs/adr/`](docs/adr/). See
> [ADR 0001](docs/adr/0001-backend-hosting.md) for why the API runs on AWS Lambda
> with Neon used as the managed Postgres database.

## Structure

```
cribsearch-monorepo/
├── apps/
│   ├── web/                  # Next.js + Tailwind → Vercel
│   └── api/                  # Express → Lambda (AWS SAM)
│       ├── atlas.hcl         # Atlas migration config (per-env)
│       ├── db/
│       │   └── bootstrap.sql # one-time superuser setup (DBs + roles)
│       ├── migrations/       # versioned Atlas SQL migrations + atlas.sum
│       └── src/
│           ├── ports/        # port interfaces (repo, queue, maps)
│           ├── adapters/     # port implementations (in-memory, SQS, stub)
│           ├── routes/       # HTTP routes
│           ├── services/     # business logic (validation, worker core)
│           ├── db/           # database access
│           ├── config/       # env access
│           ├── composition.ts # wires ports per environment
│           ├── app.ts        # Express app (shared by server + handler)
│           ├── server.ts     # local dev entry
│           ├── handler.ts    # API Lambda entry (serverless-http)
│           └── worker.ts     # Worker Lambda entry (SQS consumer)
├── packages/
│   ├── logger/               # shared Winston logger (@cribsearch/logger)
│   └── shared-types/         # request/response contracts
├── docker-compose.yml        # local Postgres (local_cribsearch)
├── turbo.json                # task pipeline + caching
├── tsconfig.base.json        # shared TS config
└── pnpm-workspace.yaml
```

## Database & migrations

Atlas runs via the official `arigaio/atlas` Docker image -- no local Atlas binary
or Xcode installation is needed. The `pnpm --filter @cribsearch/api db:migrate:*`
scripts wrap `docker run` calls so you never invoke Atlas directly.

Each deployment universe gets its own Postgres database on Neon.
See [ADR 0007](docs/adr/0007-per-universe-databases.md) for the rationale and
[ADR 0008](docs/adr/0008-atlas-migrations.md) for the migration tool choice.

| Universe    | Database                 | Admin (DDL / migrations)          | Read-write (app DML)              | Read-only                         |
| ----------- | ------------------------ | --------------------------------- | --------------------------------- | --------------------------------- |
| development | `development_cribsearch` | `development_cribsearch_admin`    | `development_cribsearch_rw`       | `development_cribsearch_ro`       |
| staging     | `staging_cribsearch`     | `staging_cribsearch_admin`        | `staging_cribsearch_rw`           | `staging_cribsearch_ro`           |
| production  | `production_cribsearch`  | `production_cribsearch_admin`     | `production_cribsearch_rw`        | `production_cribsearch_ro`        |
| local       | `local_cribsearch`       | (Docker Compose default)          | —                                 | —                                 |

### Bootstrap (one-time)

Run `apps/api/db/bootstrap.sql` once as the Neon default/owner role
(`neondb_owner`) to create the databases and three per-universe roles
(admin / rw / ro). **Replace every `CHANGE_ME_*` placeholder password** in the
script with real secrets before executing.

### Local development

`docker compose up -d` starts two Postgres containers and a one-shot migration
service:

- **`postgres`** -- the application database (`local_cribsearch`, port 5432).
- **`postgres-dev`** -- an ephemeral scratch database used by Atlas for
  validate (`local_cribsearch_dev`, port 5433). No named volume; data is
  disposable.
- **`migrate`** -- a one-shot Atlas container that automatically applies all
  pending migrations to `local_cribsearch` once `postgres` is healthy. No manual
  `pnpm` step is needed for routine local dev.

On first run, the `migrate` service generates `apps/api/migrations/atlas.sum`,
which should be committed to the repository.

```bash
docker compose up -d          # starts postgres + postgres-dev, auto-applies migrations
```

The `pnpm --filter @cribsearch/api db:migrate:*` scripts remain available for
authoring new migrations (`hash`), validating migration integrity
(`validate`), and ad-hoc applies.

### Migration commands

All commands use the `arigaio/atlas` Docker image under the hood. No local Atlas
binary is required.

| Command | Description |
| ------- | ----------- |
| `pnpm --filter @cribsearch/api db:migrate:apply` | Apply pending migrations to the local DB |
| `pnpm --filter @cribsearch/api db:migrate:validate` | Validate migration directory integrity (uses `postgres-dev`) |
| `pnpm --filter @cribsearch/api db:migrate:new` | Create a new empty migration file (edit it on the host, then run `hash`) |
| `pnpm --filter @cribsearch/api db:migrate:hash` | Regenerate `atlas.sum` checksum |

`atlas.sum` must be generated with Atlas (`db:migrate:hash`) and committed
alongside any migration changes. CI will reject PRs with a stale checksum.

## Prerequisites

- Node 24 (`nvm use` reads `.nvmrc`)
- pnpm 10 (`corepack enable`)
- Docker (for local Postgres, Atlas migrations via `arigaio/atlas`, and SAM local testing)
- For deploying the API: [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)

## Getting started

```bash
pnpm install
cp .env.example .env          # fill in Neon / Postgres credentials
pnpm dev                      # runs web + api together (Turborepo)
```

- Web: http://localhost:3000
- API: http://localhost:3001

### API endpoints

| Method | Path | Description |
| ------ | ---- | ----------- |
| `GET` | `/cribsearch/v1/health` | Health check |
| `POST` | `/cribsearch/v1/journey` | Submit a Journey Search Request → `202 Accepted` |
| `GET` | `/cribsearch/v1/journey/:id` | Poll for Journey Search Response |

> **Note:** The deployed `GET /journey/:id` round-trip does not yet reflect worker
> updates because the repository is an in-memory dummy (each Lambda has its own
> memory). This will work once a real shared store replaces the dummy — see
> [ADR 0003](docs/adr/0003-async-search-processing.md). Local dev and tests
> round-trip correctly because the in-process queue shares one memory.

A [Bruno](https://www.usebruno.com/) collection is checked in at
`apps/api/bruno/`. Open it in the Bruno app, select the **local** environment,
and run requests against the dev server (`pnpm dev`).

## Common commands

| Command          | Description                                  |
| ---------------- | -------------------------------------------- |
| `pnpm dev`       | Run all apps in watch mode                   |
| `pnpm build`     | Build all workspaces                         |
| `pnpm typecheck` | Type-check all workspaces                    |
| `pnpm lint`      | Lint all workspaces                          |
| `pnpm test`      | Run all tests                                |
| `pnpm format`    | Prettier write across the repo               |

## Deployment

Deployment is automated via GitHub Actions. On push to `main`, `.github/workflows/deploy.yml`
runs a `verify` job (typecheck/lint/test/build) and then, gated on it, deploys only
the app that changed:

- **`deploy-ui`** → Vercel, via the vendored `./.github/actions/vercel-deploy-ui`
  composite action (production deploy).
- **`migrate`** → runs `atlas migrate apply` against `production_cribsearch`
  before the API deploy, ensuring the database schema is up to date before new
  code goes live. The connection string is read from SSM.
- **`deploy-api`** → AWS, via the shared `sam-build-and-package` + `sam-deploy`
  actions in `thekhoo/github-actions-shared`. AWS access is keyless (GitHub OIDC →
  `github-actions-oidc-entry-role` → `github-actions-thekhoo-cribsearch-monorepo-deployment`).
  Artefacts are packaged to `s3://aws-management-codepipeline/production/sam/<sha>/`
  and deployed as the CloudFormation stack `production-cribsearch`.

`ci.yml` runs the same verification on pull requests / merge queue, plus
`atlas migrate validate` to catch migration issues
before merge. See [ADR 0006](docs/adr/0006-cicd-github-actions.md) for the
rationale.

### What the API deploys

Two Lambda functions: **ApiFunction** (Express behind an HTTP API) and
**WorkerFunction** (SQS consumer). An SQS queue (`JourneyQueue`) connects them,
with a dead-letter queue (`JourneyDeadLetterQueue`, `maxReceiveCount: 3`). The
SAM template (`apps/api/template.yaml`) is parameterised by `Environment`
(`development | staging | production`); only `production` is wired today.

### One-time manual setup

These prerequisites live outside the repo and must exist before the pipeline works:

1. **Vercel project** pointing at this repo — **Root Directory** `apps/web`. Note its
   org ID and project ID, and create an API token.
2. **GitHub `production` environment** with secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID`,
   `VERCEL_PROJECT_ID`.
3. **~~SSM Supabase params~~ (DEPRECATED):** the legacy Supabase SSM parameters
   (`/production/cribsearch/service/supabase/url` and
   `/production/cribsearch/service/supabase/service-role-key`) are no longer used.
   The database now uses the per-field Postgres SSM parameters under
   `/{universe}/cribsearch/service/postgres/*` (see step 6 below).

4. **`NEXT_PUBLIC_API_URL`** in Vercel → set to the API Gateway base URL output by the
   first API deploy (stack output `ApiBaseUrl`).
5. **Database bootstrap:** run `apps/api/db/bootstrap.sql` once as the Neon
   default/owner role (`neondb_owner`) on the Neon host
   (`ep-xxxx.<region>.aws.neon.tech`; use the `-pooler` variant for app/Lambda
   connections). Replace every `CHANGE_ME_*` placeholder with real secrets. This
   creates the per-universe databases and three roles per universe (admin / rw / ro).
   The CI migrate job reads the `admin/user` / `admin/password` SSM params
   (`*_admin` role, for DDL); the app runtime uses the flat `user` / `password`
   params (`*_rw` role). Run it over the **direct** Neon endpoint (not `-pooler`,
   so `\c` between databases works):

   ```bash
   psql "postgresql://neondb_owner:<PWD>@ep-xxxx.<region>.aws.neon.tech/neondb?sslmode=require" \
     -f apps/api/db/bootstrap.sql
   ```

6. **SSM Postgres connection params:** provision the per-universe connection
   parameters used by Atlas migrations and (later) the Lambda runtime:

   ```bash
   P=/production/cribsearch/service/postgres
   # shared
   aws ssm put-parameter --region eu-west-2 --name $P/port     --type String       --value "5432" --overwrite
   aws ssm put-parameter --region eu-west-2 --name $P/database --type String       --value "production_cribsearch" --overwrite
   # app runtime (read-write) — read by resolvePostgresConfig; POOLED Neon host
   aws ssm put-parameter --region eu-west-2 --name $P/host     --type String       --value "ep-xxxx-pooler.<region>.aws.neon.tech" --overwrite
   aws ssm put-parameter --region eu-west-2 --name $P/user     --type String       --value "production_cribsearch_rw" --overwrite
   aws ssm put-parameter --region eu-west-2 --name $P/password --type SecureString  --value "<rw-password>" --overwrite
   # migrations (admin / DDL) — read by the CI migrate job; DIRECT host (no -pooler) for Atlas advisory locks
   aws ssm put-parameter --region eu-west-2 --name $P/admin/host     --type String       --value "ep-xxxx.<region>.aws.neon.tech" --overwrite
   aws ssm put-parameter --region eu-west-2 --name $P/admin/user     --type String       --value "production_cribsearch_admin" --overwrite
   aws ssm put-parameter --region eu-west-2 --name $P/admin/password --type SecureString  --value "<admin-password>" --overwrite
   ```

7. **Deployment role update:** attach the policy in
   `.github/iam/deploy-role-postgres-ssm-policy.json` to the deployment role
   `github-actions-thekhoo-cribsearch-monorepo-deployment` (provisioned outside
   this repo). This grants `ssm:GetParameter` / `ssm:GetParameters` /
   `ssm:GetParametersByPath` for `/production/cribsearch/service/postgres/*` and
   the corresponding `kms:Decrypt` for SecureString values.

The AWS deployment role and the (placeholder) SSM params are already provisioned in
account `020844256789` / `eu-west-2`.

### Manual deploy (fallback)

```bash
cd apps/api
pnpm sam:build                # esbuild bundles TypeScript
sam deploy --guided --parameter-overrides Environment=production
```

Run the API locally against the Lambda packaging with `pnpm sam:local` (requires Docker).

## Logging

The API uses `@cribsearch/logger` (Winston). In production (and by default),
logs are single-line JSON to stdout for CloudWatch Logs Insights. In
`NODE_ENV=development`, output is colorized and human-readable. The level is
controlled by `LOG_LEVEL` (default `info`). Under `NODE_ENV=test` the console
transport is silent.

HTTP request logs carry a `requestId` (from `x-request-id` / `x-amzn-trace-id`
or a generated UUID). The async processing pipeline correlates on
`journeyRequestId`. See [ADR 0004](docs/adr/0004-structured-logging.md).

## Conventions

- TypeScript everywhere, `strict` mode (see `tsconfig.base.json`).
- Shared contracts live in `packages/shared-types` — import them in both apps rather than redefining shapes.
- The Express app is defined once in `apps/api/src/app.ts` and reused by both the local server and the Lambda handler.
