# 14. Property Details as post-result annotations

- Status: Accepted
- Date: 2026-07-02

## Context

Users want to record the advertised **price** (amount + currency + period), a
short **description**, and a **listing URL** for the candidate rental behind a
**Search**, plus give the Search a memorable **name**.

This sits in tension with two earlier positions:

1. Cribsearch is **not a listings browser** — the placeholder `Property` type
   (a real-estate listing with price/bedrooms) was deliberately superseded by
   **Search** (see `CONTEXT.md`), which evaluates the livability of an address
   rather than modelling a listing.
2. A **Search Request** is an immutable, asynchronously-processed compute job
   (ADR 0003). `nickname` previously rode along inside its `request` jsonb,
   which makes it impossible to edit after the fact.

None of this new data influences the amenities or travel stats — it is
user-supplied metadata for the user's own comparison and recall.

## Decision

Introduce **Property Details** as **post-result annotations** on a Search,
captured and edited only after results return — never in the Search Request /
compute job.

- **Search name** becomes a dedicated nullable `search_name` **column** on
  `searches`, relocated **out** of the `request` jsonb and removed from
  `SearchRequest`. It is editable at any time and stands in as the Search's
  title (with the address shown beneath) on the History page.
- **Price**, **Description**, and **Listing URL** are stored together in a
  single new `property_details` **jsonb** column
  (`{ price?: { amount?, currency?, period? }, description?, listingUrl? }`).
  Every field is independent and optional; a Price may be wholly or partly
  blank. Period is one of `pd | pw | pcm | pa`; currency is an ISO 4217 code;
  a bare-domain Listing URL is auto-prefixed with `https://` then validated.
- A new `PATCH /searches/:id` (ownership-checked) replaces these annotation
  fields. `Search` and `SearchSummary` carry them on read.

## Considered Options

- **Dedicated columns per field** (e.g. `price_amount`, `price_currency`,
  `listing_url`, `description`). Rejected: these are sparse, purely descriptive,
  never queried or joined on, and expected to evolve — a jsonb bag keeps the
  schema stable as fields are added. `search_name` is the exception: it is a
  first-class Search attribute used for display/sort, so it earns a column.
- **Fold annotations back into the `request` jsonb.** Rejected: the request is
  an immutable compute job; mutating it to store post-hoc user notes conflates
  two very different lifecycles.

## Consequences

- Reintroduces user-facing **price** despite the "not a listings browser"
  stance. This is deliberate and reconciled in `CONTEXT.md`: Property Details
  are the user's own notes _about_ a candidate, not a listing Cribsearch
  sources or searches over.
- `SearchRequest` no longer carries `nickname`; mappers and the summary query
  read `search_name`/`property_details` from columns instead of the request.
- Existing rows: `search_name` is backfilled from `request->>'nickname'` where
  present (in practice none, as the UI never set it).

## Revisit if

- Property Details fields start being queried, sorted, or filtered on (e.g.
  "show me all Searches under €1,500 pcm") — that would justify promoting price
  out of jsonb into typed columns with an index.
