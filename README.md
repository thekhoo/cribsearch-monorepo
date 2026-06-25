# Cribsearch Monorepo

A monorepo containing the Cribsearch web frontend and backend API.

| Workspace                  | Stack                                  | Deploys to            |
| -------------------------- | -------------------------------------- | --------------------- |
| `apps/web`                 | Next.js 15 (App Router) + Tailwind v4  | Vercel                |
| `apps/api`                 | Express on Lambda (`serverless-http`)  | AWS (Lambda + API GW) |
| `packages/shared-types`    | TypeScript types shared web ↔ api      | —                     |
| `packages/logger`          | Shared Winston logger (JSON + dev)     | —                     |

- **Package manager / orchestration:** pnpm workspaces + [Turborepo](https://turbo.build)
- **Data layer:** Supabase (Postgres) via `@supabase/supabase-js`
- **Infra-as-code:** AWS SAM (`apps/api/template.yaml`)

> Architecture decisions are recorded in [`docs/adr/`](docs/adr/). See
> [ADR 0001](docs/adr/0001-backend-hosting.md) for why the API runs on AWS Lambda
> with Supabase used as the database only.

## Structure

```
cribsearch-monorepo/
├── apps/
│   ├── web/                  # Next.js + Tailwind → Vercel
│   └── api/                  # Express → Lambda (AWS SAM)
│       └── src/
│           ├── ports/        # port interfaces (repo, queue, maps)
│           ├── adapters/     # port implementations (in-memory, SQS, stub)
│           ├── routes/       # HTTP routes
│           ├── services/     # business logic (validation, worker core)
│           ├── db/           # Supabase access
│           ├── config/       # env access
│           ├── composition.ts # wires ports per environment
│           ├── app.ts        # Express app (shared by server + handler)
│           ├── server.ts     # local dev entry
│           ├── handler.ts    # API Lambda entry (serverless-http)
│           └── worker.ts     # Worker Lambda entry (SQS consumer)
├── packages/
│   ├── logger/               # shared Winston logger (@cribsearch/logger)
│   └── shared-types/         # request/response contracts
├── turbo.json                # task pipeline + caching
├── tsconfig.base.json        # shared TS config
└── pnpm-workspace.yaml
```

## Prerequisites

- Node 24 (`nvm use` reads `.nvmrc`)
- pnpm 10 (`corepack enable`)
- For deploying the API: [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html) + Docker

## Getting started

```bash
pnpm install
cp .env.example .env          # fill in Supabase credentials
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
- **`deploy-api`** → AWS, via the shared `sam-build-and-package` + `sam-deploy`
  actions in `thekhoo/github-actions-shared`. AWS access is keyless (GitHub OIDC →
  `github-actions-oidc-entry-role` → `github-actions-thekhoo-cribsearch-monorepo-deployment`).
  Artefacts are packaged to `s3://aws-management-codepipeline/production/sam/<sha>/`
  and deployed as the CloudFormation stack `production-cribsearch`.

`ci.yml` runs the same verification on pull requests / merge queue only. See
[ADR 0006](docs/adr/0006-cicd-github-actions.md) for the rationale.

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
3. **SSM Supabase params** (the API reads these at runtime; created with placeholder
   values, replace with real credentials):

   ```bash
   aws ssm put-parameter --name /production/cribsearch/service/supabase/url \
     --type String --value "$SUPABASE_URL" --overwrite
   aws ssm put-parameter --name /production/cribsearch/service/supabase/service-role-key \
     --type SecureString --value "$SUPABASE_SERVICE_ROLE_KEY" --overwrite
   ```

4. **`NEXT_PUBLIC_API_URL`** in Vercel → set to the API Gateway base URL output by the
   first API deploy (stack output `ApiBaseUrl`).

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
