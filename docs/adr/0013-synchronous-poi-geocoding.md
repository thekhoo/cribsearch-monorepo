# 13. Synchronous POI geocoding

- Status: Accepted
- Date: 2026-06-30

## Context

Creating or editing a **POI** requires geocoding the user-entered address to
obtain its coordinates. A POI add/edit is a single, fast geocode call with
immediate user feedback expectations. Unlike a **Search**, which fans out to
many maps-API calls across multiple destinations and modes (see ADR 0003),
a POI geocode is bounded and fast.

The async machinery used for Search (SQS queue, worker Lambda, status polling)
would add unjustified operational and UX overhead to a simple one-shot call.

## Decision

POI add/edit **geocodes synchronously within the request handler and rejects
on failure.**

- **Permanent geocode failure** (e.g. address not found) → `400 Bad Request`,
  nothing is saved to the database.
- **Transient Google error** (5xx, 429 throttle) → `503 Service Unavailable`,
  nothing is saved.
- **Success** → `201 Created` (POST) or `200 OK` (PUT), POI is persisted
  with coordinates.

The caller receives immediate feedback; no polling is required.

## Consequences

- **Fast, synchronous UX:** Users see validation errors or success
  instantly. No status column, no worker, no polling UI needed.
- **Simpler data model:** POIs are always in a consistent state
  (address + coordinates, or not persisted at all). No in-flight
  states to manage.
- **Request timeout risk:** If the geocode call is very slow or the
  provider times out, the HTTP request may exceed the Lambda timeout.
  In practice, geocode calls are fast (under 1s typically); this is
  acceptable for POIs. If it becomes a problem, add client-side
  retries with exponential backoff, not async queueing.
- **Contrast with Search:** Deliberately deviates from the
  async pattern; the architectural choice reflects the different
  scale and feedback expectations of the two operations.

## Revisit if

- Batch POI operations are required (e.g. import 100 POIs at once),
  making a single synchronous call impractical, or
- Geocoding latency consistently exceeds the request timeout and
  warrants async handling with status polling.
