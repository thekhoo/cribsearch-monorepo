# 11. UTC-only timestamps and service-side uuidv7 IDs

- Status: Accepted
- Date: 2026-06-28

## Context

The initial schema (migration `20260625000000_init.sql`) used two conventions
that were identified as error-prone:

1. **`timestamptz` columns named `created_at` / `updated_at`.**
   `timestamptz` stores an instant and shifts the displayed value to the
   session or client timezone. In a service where every writer is the Node
   application and every reader is also the Node application (or a DBA
   session), the time-zone shifting adds complexity without benefit. The
   implicit contract — "this is UTC" — was not visible in the column name,
   making it easy to accidentally interpret the value in a local timezone.

2. **`DEFAULT gen_random_uuid()` on all primary-key columns.**
   `gen_random_uuid()` produces UUID v4 (random). Random UUIDs scatter inserts
   across the B-tree index, degrading write performance and causing index
   bloat as the table grows. Additionally, because the ID is generated
   by the database on `INSERT`, the application does not know the row ID
   until after the round-trip, complicating pre-insert logic or optimistic
   client-side ID assignment.

Both issues are addressed in migration
`apps/api/migrations/20260628140000_utc_timestamps_and_uuid7_defaults.sql`
(applied via Atlas — see [ADR 0008](0008-atlas-migrations.md)).

## Decision

### 1. Timestamp convention: `timestamp` WITHOUT time zone, named `*_utc`

All timestamp columns across `users`, `folders`, `searches`, and
`search_destinations` are:

- **Changed from `timestamptz` to `timestamp` (without time zone).**
  The stored value is always a UTC wall-clock instant. Removing the time-zone
  type guarantees no session- or client-timezone conversion occurs at read
  time — the value is always returned as-is.
- **Default changed to `(now() AT TIME ZONE 'UTC')`**, which produces a
  bare UTC timestamp (no offset) at insert time, consistent with the column
  type.
- **Renamed to make the UTC contract explicit in the column name:**
  - `created_at` → `created_at_utc`
  - `updated_at` → `last_updated_at_utc`

The `search_destinations` table previously had no timestamp columns; both
`created_at_utc` and `last_updated_at_utc` are added as part of this change.

All application code (raw SQL data functions — see [ADR 0010](0010-feature-folders-raw-sql.md))
reads and writes these columns expecting UTC bare timestamps.

### 2. Service-side uuidv7 IDs for application-owned tables

For `searches` and `search_destinations` — tables whose rows are created
exclusively by the Node application — the `DEFAULT gen_random_uuid()` on the
primary-key column is **dropped**. The application now:

1. Generates a UUID v7 ID using the `uuidv7` npm package before issuing the
   `INSERT`.
2. Passes the ID explicitly in the SQL statement.
3. Receives the ID synchronously, before any database round-trip.

**Why uuidv7?** UUID v7 embeds a millisecond-precision Unix timestamp in the
high bits, so newly inserted rows sort approximately in insertion order within
the B-tree index. This reduces random page splits, improves cache locality for
recent-row queries, and keeps `VACUUM` work manageable as the table grows.

**Scope of the change:**

| Table | PK column | Default after migration |
| ----- | --------- | ----------------------- |
| `searches` | `search_id` | None — service supplies uuidv7 |
| `search_destinations` | `search_destination_id` | None — service supplies uuidv7 |
| `users` | `id` | `gen_random_uuid()` retained (no service insert path) |
| `folders` | `id` | `gen_random_uuid()` retained (no service insert path) |

`users` and `folders` are deferred: no application code currently inserts
rows into these tables via the service layer, so switching them would be a
no-op in practice and can be done when a real insert path is introduced.

## Consequences

**Positive:**

- Timestamp semantics are unambiguous. The `_utc` suffix in every column name
  makes the UTC contract visible to any reader of a schema dump, query, or
  migration — no implicit knowledge of time-zone conventions needed.
- No session-timezone surprises. `timestamptz` silently shifts values when
  `SET TIME ZONE` changes. The new `timestamp` columns are immune to this.
- Service-owned IDs are time-ordered, reducing B-tree churn for the most
  frequently inserted tables.
- The application knows the ID before the INSERT, simplifying code that needs
  to reference the new row before committing (e.g. nested inserts in a
  transaction — the pattern already used in `withTransaction` from ADR 0010).

**Negative / Trade-offs:**

- The application is now responsible for ID uniqueness on `searches` and
  `search_destinations`. UUID v7 from a single node is effectively unique, but
  the guarantee comes from the `uuidv7` library and the `PRIMARY KEY`
  constraint rather than the database default.
- `users` and `folders` still use `gen_random_uuid()` (v4). This inconsistency
  will resolve naturally once insert paths for those tables are added.
- Any external tooling that inserts rows into `searches` or
  `search_destinations` without specifying the PK (e.g. a psql `COPY` or
  manual SQL) will now fail rather than silently receiving a random UUID.

## Revisit if

- A second writer (e.g. a second service or a background job) inserts into
  `searches` without going through the Node layer — at that point the ID
  generation strategy must be coordinated across writers, or a DB default
  restored.
- UUID v7 support is added to Postgres natively (proposed for PG 18), at
  which point the DB default could be reinstated as `gen_uuidv7()` and the
  npm dependency dropped.
- Clock skew or monotonicity requirements demand a different time-ordered ID
  scheme (e.g. ULID).
