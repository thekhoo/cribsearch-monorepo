# 3. Asynchronous Search processing via SQS + worker Lambda

- Status: Accepted
- Date: 2026-06-24

## Context

Running a **Search** means calling a maps provider (Google Maps) once per
destination per transport mode (ADR 0002). A single submission therefore fans
out into many slow, rate-limited, billable calls. Answering the HTTP request
**synchronously** would tie request latency to the slowest provider call, risk
API Gateway / Lambda timeouts on larger submissions, and make a transient
provider error fail the whole request with nothing to retry.

The API today is a single Express-on-Lambda function (ADR 0001) serving requests
in one round-trip. We need a request lifecycle that absorbs slow, partially
failing, costly work without blocking the caller.

## Decision

Accept Search submissions **asynchronously** and process them in the background.

1. **Two functions, one queue.** `POST /homefinder/v1/journey` (the existing
   Express/API Lambda) validates a **Journey Search Request**, persists it as
   `Pending`, enqueues it on an SQS queue, and returns **202 Accepted** with a
   **Journey Search Response** in `Pending`. A **separate worker Lambda**
   consumes the queue, flips the request to `Processing`, performs the maps work,
   and writes a terminal state. The caller polls
   `GET /homefinder/v1/journey/{id}`.

2. **Request Status lifecycle.** `Pending → Processing →
   Complete | PartialFailure | Failed` (see `CONTEXT.md`). `PartialFailure`
   surfaces a partial result with the missing pieces marked; `Failed` means no
   usable result (e.g. the address could not be resolved).

3. **Full payload on the queue.** The SQS message carries the whole submission
   plus the `journeyRequestId`, so the worker needs no initial DB read.

4. **Ports for the three side-effecting collaborators** —
   `JourneyRequestRepository`, `JourneyQueue`, `MapsProvider` — injected at
   startup. On AWS: in-memory repo (dummy, for now), SQS queue, stub maps
   provider. Locally and in tests: in-memory repo, an **in-process** queue that
   runs the worker logic inline, stub maps provider.

5. **Reliability.** A dead-letter queue with `maxReceiveCount` 3; the worker
   **throws** on transient errors (provider 5xx/timeout/throttle) to let SQS
   redeliver, marks `Failed` on permanent errors, and `PartialFailure` on mixed
   outcomes. Writes are idempotent (keyed by `journeyRequestId`) with a
   terminal-state short-circuit, and the SQS visibility timeout is set ≥ the
   Lambda timeout — together giving effectively-once processing under SQS's
   at-least-once delivery.

## Consequences

- Request latency is decoupled from maps-provider latency; large or slow
  submissions no longer threaten the request timeout.
- The API is **eventually consistent**: callers must poll for the result rather
  than receive it inline. The web app needs a polling (or later, push) flow.
- A transient provider failure is retried automatically; a dead message is
  preserved in the DLQ for inspection instead of being lost or silently failing.
- Partial provider failure still yields a usable Search (`PartialFailure`)
  rather than an all-or-nothing error.
- **Known limitation (current slice):** the repository is an **in-memory dummy**.
  Each Lambda has its own process memory, so on AWS the worker's update is not
  visible to `GET` — the deployed round-trip will not complete until a real
  shared store (Supabase) is wired behind `JourneyRequestRepository`. Local dev
  and tests round-trip correctly because the in-process queue shares one memory.
- **Deferred:** auto-flipping rows stuck in `Processing` after DLQ exhaustion (a
  reaper); retrying `Failed`/`PartialFailure` requests; the attach-by-id POI
  library (requests carry POIs by value for now); `PUT /journey`.

## Revisit if

- The product needs results pushed to the client (WebSocket/SSE) rather than
  polled, or
- submissions become small/fast enough that synchronous processing within the
  request timeout is acceptable, removing the need for the queue and worker.
