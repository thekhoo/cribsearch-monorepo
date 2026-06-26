# 10. Feature-folder structure with raw-SQL data functions

- Status: Accepted
- Date: 2026-06-26

## Context

The `apps/api` backend was structured as a layered hexagonal architecture:
`routes/`, `services/`, `ports/` (interfaces), and `adapters/` (implementations),
wired together by a `composition.ts` dependency-injection root that built a
singleton `ports` container. The journey search persistence layer was originally
an in-memory repository (a class implementing the `JourneyRequestRepository`
port), which proved unsuitable for distributed Lambda deployments as described
in ADR 0003.

We are now introducing real Postgres persistence backed by raw SQL (per ADR
0007) and chose to restructure the backend at the same time to improve
feature cohesion and code clarity.

## Decision

Reorganise `apps/api/src` around **features** rather than **technical layers**.
Journey search will live under `features/journey/` with three subdirectories:
`controller`, `service`, and `data`, each holding its concern for that feature.

Key architectural choices:

1. **Data layer as functions, not classes.** Each data function takes a
   `pg.PoolClient` and executes raw SQL. There is no repository interface, no
   factory pattern, and no class wrappers — plain functions replace the
   abstraction layer.

2. **Transactions via `withTransaction` helper.** A `shared/db/` module exports
   a `withTransaction(fn)` function that acquires a pooled client, runs `BEGIN`,
   invokes `fn(client)`, `COMMIT`s on success, `ROLLBACK`s on error, and always
   releases the connection. The **service layer** composes multiple data functions
   inside a single `withTransaction` call to ensure multi-table writes (e.g.
   `searches` + `search_destinations`) are atomic.

3. **Shared infrastructure under `shared/`.** Cross-cutting concerns — the
   Postgres connection pool, the `withTransaction` helper, environment config,
   the SQS queue client, and maps-provider clients — all live in `shared/`.
   These are imported directly by features that need them.

4. **Remove the composition root and in-process queue.** The dependency-injection
   container is eliminated; modules import their dependencies directly (config,
   pool, SQS client, etc.) at the point of use. The in-process queue (used for
   synchronous local testing) is removed — `queue` becomes SQS only. This
   simplifies the module graph and removes the test-only convenience that was
   masking the distributed nature of the production system.

## Consequences

**Positive:**

- Simpler, more readable code: raw SQL is transparent and no abstraction layers
  obscure what queries run. Function composition is clearer than injection.
- Feature cohesion: a feature folder contains all its routes, business logic, and
  data access in one place, reducing cognitive load when navigating the codebase.
- **Resolves ADR 0003's limitation:** shared Postgres persistence is now
  real and distributed. The worker Lambda's writes to `journeys` are immediately
  visible to `GET` calls in the API Lambda, fixing the in-memory visibility gap.

**Negative / Trade-offs:**

- **Integration-test-only journey tests:** Loss of easy in-memory swapping means
  journey tests now require a real Postgres database. A separate `test:integration`
  npm script runs these tests against the local Docker Postgres; unit tests for
  services (mocking data functions) remain lightweight but are fewer in number.
- **Local end-to-end now requires two steps:** The in-process queue is gone, so
  a local dev workflow is no longer single-round-trip (`POST /journey` → result
  inline). Instead, `POST /journey` enqueues and returns `202 Pending`, and the
  worker must be invoked separately (e.g. by manually calling a test helper or
  polling with `GET /journey/{id}`). This mirrors production but loses the
  convenience of immediate feedback.

**Supersedes:**

This ADR supersedes the portion of **ADR 0007** that anticipated a "raw `pg`
adapter behind the `JourneyRequestRepository` port." There is no longer a
repository port; data functions and `withTransaction` replace it entirely.
References to ADR 0003 (async queue / eventual consistency) and ADR 0007
(per-universe databases) remain applicable and inform the persistence layer.

## Revisit if

- The team finds that feature-folder organization becomes unwieldy for very
  large features (e.g. a folder with 10+ files), or
- raw SQL queries become hard to maintain or version (consider a migration tool
  or query builder if this becomes a pain point), or
- transaction composition becomes too deeply nested for clarity (consider a
  transaction-context pattern if this emerges).
