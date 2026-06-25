# HomeFinder Monorepo

A monorepo containing the HomeFinder web frontend and backend API.

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
homefinder-monorepo/
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
│   ├── logger/               # shared Winston logger (@homefinder/logger)
│   └── shared-types/         # request/response contracts
├── turbo.json                # task pipeline + caching
├── tsconfig.base.json        # shared TS config
└── pnpm-workspace.yaml
```

## Prerequisites

- Node 20 (`nvm use` reads `.nvmrc`)
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
| `GET` | `/homefinder/v1/health` | Health check |
| `POST` | `/homefinder/v1/journey` | Submit a Journey Search Request → `202 Accepted` |
| `GET` | `/homefinder/v1/journey/:id` | Poll for Journey Search Response |

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

### Web → Vercel

Create a Vercel project pointing at this repo with:

- **Root Directory:** `apps/web`
- **Install Command:** `pnpm install` (run at repo root)
- Set `NEXT_PUBLIC_API_URL` to the deployed API base URL.

Vercel detects the Turborepo setup automatically.

### API → AWS (SAM)

The API deploys two Lambda functions:

- **ApiFunction** — Express app behind API Gateway (HTTP API).
- **WorkerFunction** — SQS consumer that processes Journey Search Requests.

An SQS queue (`JourneyQueue`) connects them, with a dead-letter queue
(`JourneyDeadLetterQueue`, `maxReceiveCount: 3`) for failed messages.

```bash
cd apps/api
pnpm sam:build                # esbuild bundles TypeScript
sam deploy --guided
```

Supabase credentials are read at runtime from SSM Parameter Store (not passed as
stack parameters). Before deploying, create the parameters:

```bash
aws ssm put-parameter --name /production/homefinder/service/supabase/url \
  --type String --value "$SUPABASE_URL"
aws ssm put-parameter --name /production/homefinder/service/supabase/service-role-key \
  --type SecureString --value "$SUPABASE_SERVICE_ROLE_KEY"
```

Run the API locally against the Lambda packaging with `pnpm sam:local` (requires Docker).

## Logging

The API uses `@homefinder/logger` (Winston). In production (and by default),
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
