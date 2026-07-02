# Cribsearch — Context & Glossary

This file is the shared language for the Cribsearch project. It is a glossary of
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

Once results have returned, the user may **name** the Search (its **search
name**) and annotate it with **Property Details**. Both are optional, user-
supplied, and editable at any time; neither affects the amenities or travel
stats.

> **Search name** vs **address**: the address is the candidate rental location
> that was evaluated (immutable, part of the originating Search Request). The
> search name is a user-given label applied _after_ results return (e.g. "Round
> 2 – Neubau flat"). Where a search name is present it stands in as the Search's
> title, with the address shown beneath it.

> Note: an earlier placeholder `Property` type modelled a real-estate listing
> (price, bedrooms) as if Cribsearch were a listings browser — it is not.
> Cribsearch evaluates the livability of an address the user is considering. The
> **Property Details** below are deliberately different: user-supplied notes
> _about_ the candidate, not a listing the system sources or searches over.

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

### POI (Place of Interest)

A place the **user** cares about and labels themselves (e.g. "Work", "Family").
A POI has a user-chosen label and an address.

POIs live in a reusable **POI library**: a POI is defined once (label + address)
and can be **attached** to any Search. Each Search controls which POIs apply to
it, and may add new ones to the library. This avoids re-entering the same place
(e.g. a workplace) for every candidate address.

The distinction: **Amenities** are found _for_ you; **POIs** are declared _by_
you.

### Property Details

Optional, user-supplied information _about_ the candidate rental behind a
**Search**, recorded after results return. Property Details never influence the
amenities or travel stats — they are annotations for the user's own comparison
and recall. They comprise:

- **Price** — the advertised rent, as an amount, a currency, and a **period**
  (per day, per week, per calendar month, or per annum). Each part is optional
  and captured independently; a Price may be wholly or partly blank.
- **Description** — a short free-text note describing the place.
- **Listing URL** — a link to the original rental page the user is evaluating.

Property Details are distinct from the superseded `Property` listing type: they
are the user's own notes on an address, not a listing Cribsearch sources.

### Travel Stat

The estimated travel time from the candidate address of a Search to a single
destination (an Amenity or an attached POI), for a given **transport mode**.

### Transport Mode

One way of travelling: walk, public transport, cycle, or drive. The user
chooses which modes apply **upfront**, before running a Search (at least one).
Only the selected modes are computed — modes the user did not ask for are not
calculated, to avoid unnecessary cost. The chosen modes are saved with the
Search, so each shown destination reports a Travel Stat per selected mode.

### Search Request

What the user **submits** to run a Search: the candidate address plus the
upfront selection (modes, amenity categories, attached POIs) defined in ADR
0002. Because computing the result means many slow, costly maps calls, a Search
Request is **accepted and processed asynchronously** rather than answered
in one round-trip — it is recorded as pending, worked in the background, and its
outcome is retrieved separately. It is distinct from the durable **Search**: the
request is the in-flight job, the Search is the completed result that lands in
**History**.

> Note: earlier drafts included a qualifier in this term's name. The qualifier has been dropped — the concept is unchanged.

### Search Response

What the system **sends back** for a Search Request: the current
processing state and, once complete, the resulting **Search** (its amenities and
travel stats). Before completion it reports progress without a result; on
failure it reports why. It is the response contract, not a stored entity — the
durable record remains the **Search**.

### Request Status

The lifecycle of a **Search Request**:

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
