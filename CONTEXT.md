# HomeFinder — Context & Glossary

This file is the shared language for the HomeFinder project. It is a glossary of
domain terms only — no implementation details. Keep it in sync as the language
evolves.

## Glossary

### Search

A record of evaluating one candidate rental **address**. The user enters an
address they are considering renting; the system finds nearby **amenities** and
computes **travel stats** from that address to each relevant destination. A
Search is saved to the **History** so it can be revisited and compared later.

A Search captures:

- the entered candidate address,
- the resulting amenities and travel stats,
- the point in time it was performed.

> Note: this supersedes the placeholder `Property` type (a real-estate listing
> with price/bedrooms), which does not reflect the product. HomeFinder is not a
> listings browser; it evaluates the livability of an address the user is
> considering.

### History

The collection of past **Searches**, browsable on its own page. From History
the user can:

- reopen a Search to see its full results again,
- select two or more Searches to **compare** side-by-side,
- delete Searches,
- organise Searches into **Folders**.

### Folder

A user-named grouping of **Searches** (e.g. "Inner West", "Round 2"). A Search
belongs to **at most one** Folder; Searches with no Folder appear as
uncategorised. Folders are flat (no nesting). A Search can be moved between
Folders.

### Amenity

A nearby place **auto-discovered** by the system for a Search, grouped by
category (e.g. supermarkets, public transport stops). For each category the
system surfaces the nearest few. The user does not define amenities; they are
found relative to the candidate address.

v1 categories: **Supermarkets, Public transport stops, Pharmacies, Parks**.

Direction: eventually the user should be able to choose from all amenity types
the underlying maps provider exposes, with similar/overlapping provider types
**grouped** into friendlier categories so the choice stays simple.

### POI (Point of Interest)

A place the **user** cares about and labels themselves (e.g. "Work", "Family").
A POI has a user-chosen label and an address.

POIs live in a reusable **POI library**: a POI is defined once (label + address)
and can be **attached** to any Search. Each Search controls which POIs apply to
it, and may add new ones to the library. This avoids re-entering the same place
(e.g. a workplace) for every candidate address.

The distinction: **Amenities** are found _for_ you; **POIs** are declared _by_
you.

### Travel Stat

The estimated travel time from the candidate address of a Search to a single
destination (an Amenity or an attached POI), for a given **transport mode**.

### Transport Mode

One way of travelling: walk, public transport, cycle, or drive. The user
chooses which modes apply **upfront**, before running a Search (at least one).
Only the selected modes are computed — modes the user did not ask for are not
calculated, to avoid unnecessary cost. The chosen modes are saved with the
Search, so each shown destination reports a Travel Stat per selected mode.

### Journey Search Request

What the user **submits** to run a Search: the candidate address plus the
upfront selection (modes, amenity categories, attached POIs) defined in ADR
0002. Because computing the result means many slow, costly maps calls, a Journey
Search Request is **accepted and processed asynchronously** rather than answered
in one round-trip — it is recorded as pending, worked in the background, and its
outcome is retrieved separately. It is distinct from the durable **Search**: the
request is the in-flight job, the Search is the completed result that lands in
**History**.

### Journey Search Response

What the system **sends back** for a Journey Search Request: the current
processing state and, once complete, the resulting **Search** (its amenities and
travel stats). Before completion it reports progress without a result; on
failure it reports why. It is the response contract, not a stored entity — the
durable record remains the **Search**.

### Request Status

The lifecycle of a **Journey Search Request**:

- **Pending** — accepted and recorded, waiting to be picked up for processing.
- **Processing** — actively being worked: the maps calls for the selected
  destinations and modes are under way.
- **Complete** — every selected destination/mode was computed; a full **Search**
  result is available.
- **PartialFailure** — the candidate address was usable and _some_ results were
  computed, but one or more destination/mode lookups failed; the partial Search
  is surfaced anyway, with the missing pieces marked.
- **Failed** — no usable result (e.g. the candidate address could not be
  resolved at all, or processing errored before any result was produced).

`Complete`, `PartialFailure`, and `Failed` are terminal. Retrying a
`PartialFailure` (or `Failed`) request is a **future** capability and out of
scope for now.
