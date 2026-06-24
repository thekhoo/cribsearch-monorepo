# 2. Evaluate addresses by surroundings; compute only what the user selects upfront

- Status: Accepted
- Date: 2026-06-24

## Context

The initial scaffolding modelled HomeFinder as a **listings browser** (a
`Property` type with title, price, bedrooms). That is not the product. HomeFinder
is a single-user tool for evaluating the **livability of a candidate rental
address**: the user enters an address they are considering, and the app reports
travel times from it to nearby amenities and to the user's own points of
interest (Work, Family).

Computing travel times means calling a maps provider (Google Maps) per
destination per transport mode. Cost grows with `modes × destinations`. A naive
design that always computes every mode (walk/transit/cycle/drive) for every
amenity category and every POI multiplies that cost even when the user only
cares about, say, cycling to two places.

## Decision

1. **Domain pivot.** HomeFinder evaluates an address by its surroundings, not a
   catalogue of listings. The placeholder `Property` listing type is removed and
   replaced by the real domain types (`Search`, `Amenity`, `Poi`, `Folder`,
   `TravelStat`, `TransportMode`, `AmenityCategory`) in
   `packages/shared-types`. See `CONTEXT.md` for the glossary.

2. **Upfront selection drives computation.** On the Search form the user
   chooses, before submitting: the transport **modes** (at least one), which
   **amenity categories** to look up, and which library **POIs** to attach. The
   system computes travel stats **only** for the selected modes and selected
   destinations. Modes/destinations the user did not select are not computed.

3. **Minimum to submit** a Search: an address, at least one mode, and at least
   one destination basis (at least one amenity category OR at least one POI).

## Consequences

- Map-API cost is bounded by the user's explicit selection, not by a fixed
  worst case.
- A saved **Search** records the exact modes/categories/POIs it was run with, so
  History and side-by-side comparison reflect what the user actually asked for.
  Two Searches may therefore not be directly row-comparable; the compare view
  places each Search's full results side-by-side rather than forcing alignment.
- To see a mode or destination that wasn't selected, the user must run a new
  Search. This is an accepted UX trade-off in favour of cost control.
- Transport mode and amenity selection are part of the request contract, so the
  same shapes serve the future API unchanged.

## Revisit if

- Map-API cost stops being a concern (e.g. caching or a flat-rate provider), in
  which case always computing all modes would simplify the UX (toggle on display
  instead of choose upfront), or
- users frequently re-run the same address only to add a mode, signalling the
  upfront constraint is more friction than the cost saving is worth.
```
