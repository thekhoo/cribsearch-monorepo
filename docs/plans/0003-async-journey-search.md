# Implementation Plan — Asynchronous Journey Search (ADR 0003)

This plan implements the async Search pipeline agreed in
[ADR 0003](../adr/0003-async-search-processing.md). Read ADR 0003 and
[`CONTEXT.md`](../../CONTEXT.md) first — they define the terms (Journey Search
Request/Response, Request Status, Search) and the trade-offs. Do not redefine
those concepts; this plan only says how to build them.

## Ground rules

- **TDD.** Write the failing test first, then the code (red → green → refactor).
- **Type-safe & functional.** `strict` TypeScript (see `tsconfig.base.json`),
  no `any`, prefer pure functions + injected ports over hidden globals.
- **Small commits.** One reviewable commit per step below.
- **Keep docs in sync.** Update `README.md` where noted; do not edit `CONTEXT.md`
  or the ADRs (those decisions are settled).
- **Logging:** `info` at pipeline checkpoints (request accepted, processing
  started, terminal state written), `warn` for recoverable issues (a single
  destination lookup failing), `error` for thrown/transient failures. Don't log
  per-call noise.
- After each step: `pnpm typecheck` and `pnpm test` must pass.

## Architecture (what you are building)

```
POST /homefinder/v1/journey
  └─ validate → repo.create(Pending) → queue.enqueue({journeyRequestId, ...payload})
       └─ 202 JourneySearchResponse{status:"Pending"}

[SQS] ──> worker Lambda ──> processJourneyRequest(msg, {repo, maps})
  repo.markProcessing → maps.findAmenities / maps.computeTravelStats
    → repo.saveResult(Complete | PartialFailure | Failed)

GET /homefinder/v1/journey/{id}  ──> repo.getById ──> JourneySearchResponse
```

Three injected **ports**, with environment-specific implementations:

| Port | AWS | Local / tests |
|------|-----|---------------|
| `JourneyRequestRepository` | in-memory dummy | in-memory dummy |
| `JourneyQueue` | SQS `SendMessage` | in-process (runs worker inline) |
| `MapsProvider` | stub (deterministic) | stub (deterministic) |

> The in-memory repo is a deliberate dummy (ADR 0003). On AWS the deployed GET
> will not reflect worker updates until a real shared store replaces it. Local
> and tests round-trip because the in-process queue shares one memory.

## Target file layout (under `apps/api/`)

```
src/
  ports/
    journey-request-repository.ts   # interface
    journey-queue.ts                # interface + message type
    maps-provider.ts                # interface
  adapters/
    in-memory-journey-repository.ts
    in-process-journey-queue.ts
    sqs-journey-queue.ts
    stub-maps-provider.ts
  services/
    process-journey-request.ts      # worker core logic (pure, takes ports)
    validate-journey-request.ts     # minimum-to-submit validation
  composition.ts                    # wires ports per environment (singleton)
  routes/
    journey.ts                      # POST + GET, mounted at /homefinder/v1/journey
    health.ts                       # (re-mounted at /homefinder/v1/health)
  worker.ts                         # SQS event adapter → process-journey-request
  app.ts                            # mount routers under /homefinder/v1
  __tests__/
    validate-journey-request.test.ts
    process-journey-request.test.ts
    journey-routes.test.ts          # integration via in-process queue
```

## Shared types (`packages/shared-types/src/index.ts`)

Add (do not remove the existing `Search`, `Amenity*`, `Poi`, etc.):

```ts
export type RequestStatus =
  | "Pending" | "Processing" | "Complete" | "PartialFailure" | "Failed";

export interface JourneySearchRequest {
  address: string;
  modes: TransportMode[];                         // >= 1
  amenityCategories: AmenityCategory[];
  pois: { label: string; address: string }[];     // attached POIs, by value
  nickname?: string;
}

export interface JourneySearchResponse {
  id: string;
  status: RequestStatus;
  search?: Search;        // present when Complete / PartialFailure
  error?: string;         // present when Failed / PartialFailure
}

/** The SQS message body. */
export interface JourneySearchMessage extends JourneySearchRequest {
  journeyRequestId: string;
}
```

## Steps

Each step = one commit. Write tests first where a test is named.

1. **shared-types contracts.** Add the types above. `pnpm --filter @homefinder/shared-types build`.

2. **Ports.** Define the three interfaces in `src/ports/`:
   - `JourneyRequestRepository`: `create(req): Promise<{id, status:"Pending"}>`,
     `getById(id): Promise<StoredJourneyRequest | null>`,
     `markProcessing(id): Promise<void>`,
     `saveResult(id, status, search?, error?): Promise<void>`.
   - `JourneyQueue`: `enqueue(msg: JourneySearchMessage): Promise<void>`.
   - `MapsProvider`: `findAmenities(address, categories): Promise<AmenityGroup[]>`,
     `computeTravelStats(fromAddress, destinations, modes): Promise<...>`.
     Define a small `MapsError` with a `kind: "transient" | "permanent"` so the
     worker can classify (see step 6).

3. **Validation** (`validate-journey-request.ts`) — **test first**
   (`validate-journey-request.test.ts`): returns `ok` only when `address` is
   non-empty, `modes.length >= 1`, and (`amenityCategories.length >= 1` OR
   `pois.length >= 1`). Otherwise an error describing what's missing. (Enforces
   ADR 0002's "minimum to submit".)

4. **In-memory repository + stub maps provider** (`adapters/`). The stub returns
   deterministic amenities/travel stats from the input, and exposes a way for
   tests to force a `permanent` failure, a `transient` failure, and a partial
   (some destinations throw) outcome. Unit-test the repo's create/get/update
   round-trip.

5. **`processJourneyRequest`** — **test first** (`process-journey-request.test.ts`).
   Signature: `processJourneyRequest(msg, {repo, maps}): Promise<void>`. Logic:
   - If `repo.getById(id)` is already terminal → no-op, return (idempotency).
   - `repo.markProcessing(id)`.
   - Run maps work. Build a `Search` from results.
   - Write terminal state: all good → `Complete`; some destinations failed →
     `PartialFailure` (save partial Search + error summary); address unresolvable
     / permanent error before any result → `Failed`.
   - On **transient** `MapsError` → **rethrow** (so SQS redelivers); leave row
     `Processing`.
   Tests: happy path → `Complete`; forced partial → `PartialFailure`; forced
   permanent → `Failed`; forced transient → throws and row stays `Processing`;
   already-terminal → no-op.

6. **In-process queue adapter** (`in-process-journey-queue.ts`): `enqueue` calls
   `processJourneyRequest` with the shared repo + maps (await it, or fire-and-
   forget but await in tests via a returned promise — keep it awaitable so tests
   are deterministic). Catch/swallow transient rethrows here to mimic SQS (log
   at `warn`).

7. **SQS queue adapter** (`sqs-journey-queue.ts`): `enqueue` → `@aws-sdk/client-sqs`
   `SendMessageCommand` to `env.journeyQueueUrl`. Add `@aws-sdk/client-sqs` to
   `apps/api` deps.

8. **Composition root** (`composition.ts`): export a singleton `ports` object
   chosen by env — on AWS (`env.journeyQueueUrl` set) use the SQS queue, else the
   in-process queue; in-memory repo + stub maps everywhere for now. Routes and
   the worker import from here.

9. **Routes** (`routes/journey.ts`): `POST /` validates → `repo.create` →
   `queue.enqueue` → `202` `JourneySearchResponse{status:"Pending"}`; on
   validation failure → `400` `ApiError`. `GET /:id` → `repo.getById` →
   `JourneySearchResponse`, or `404` `ApiError` if unknown.

10. **Mounting** (`app.ts`): mount `journeyRouter` at
    `/homefinder/v1/journey` and `healthRouter` at `/homefinder/v1/health`.
    Remove the legacy `/properties` mount **only if** you also delete its route +
    service (otherwise leave it; it is out of scope — see open issue).

11. **Integration test** (`journey-routes.test.ts`) with `supertest` (add as a
    devDep): POST a valid request → expect `202` + `Pending`; then GET the id →
    expect `Complete` and a populated `search`. Add a forced-failure variant →
    `PartialFailure`/`Failed`. Add a `400` validation case. (In-process queue
    makes this hermetic — no AWS.)

12. **Worker entry** (`worker.ts`): an `SQSHandler` (`@types/aws-lambda` is
    already a dep) that parses each record body as `JourneySearchMessage` and
    calls `processJourneyRequest` with the ports. Let transient rethrows
    propagate so SQS/Lambda retries (use partial-batch-failure reporting:
    return `batchItemFailures`).

13. **SAM template** (`template.yaml`): add
    - `JourneyQueue` (`AWS::SQS::Queue`) with `RedrivePolicy` →
      `JourneyDeadLetterQueue`, `maxReceiveCount: 3`; `VisibilityTimeout: 60`
      (≥ the 30s function timeout).
    - `JourneyDeadLetterQueue` (`AWS::SQS::Queue`).
    - `WorkerFunction` (`AWS::Serverless::Function`, handler `worker.handler`,
      esbuild entry `src/worker.ts`) with an `SQS` event source on `JourneyQueue`
      and `FunctionResponseTypes: [ReportBatchItemFailures]`.
    - On `ApiFunction`: env var `JOURNEY_QUEUE_URL: !Ref JourneyQueue` and
      `SQSSendMessagePolicy` for the queue. On `WorkerFunction`:
      `SQSPollerPolicy` for the queue.
    - Output the queue URL.

14. **Config** (`config/env.ts`): add `journeyQueueUrl: process.env.JOURNEY_QUEUE_URL ?? ""`.

15. **Docs.** Update `README.md`: new endpoints under `/homefinder/v1/...`, the
    second (worker) Lambda + queue in the structure/deploy sections, and a note
    that the deployed GET round-trip is pending the real DB (link ADR 0003).

## Definition of done

- `pnpm typecheck`, `pnpm lint`, `pnpm test` all pass at repo root.
- Unit tests: validation, repository, `processJourneyRequest` (all five paths).
- Integration test: POST→GET round-trip + 400 + a failure variant, via the
  in-process queue.
- `sam build` succeeds (template valid). Real `sam deploy` is **not** required
  for this slice.
- README reflects the new endpoints and the worker/queue topology.

## Out of scope (do NOT build)

Real Supabase persistence; real Google Maps client; POI library (attach-by-id);
`PUT /journey`; retry of Failed/PartialFailure; stuck-`Processing` reaper; web
app polling UI. Leave the legacy `/properties` route alone unless removing it
cleanly in step 10.
