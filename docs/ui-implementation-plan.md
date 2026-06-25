# Cribsearch Web UI — Implementation Plan

Scope: build the **front-end UI only** for Cribsearch in `apps/web`. No backend,
no real Google Maps calls, no CI/CD. Travel-stat results are **faked** but every
interaction works in-session (state resets on page refresh — this is expected).

Read alongside:

- `CONTEXT.md` (root) — domain glossary. Authoritative for terminology.
- `docs/adr/0002-upfront-compute-selection.md` — why selection is upfront.

## Stack (already set up)

- Next.js 15 (App Router), React 19, TypeScript strict.
- Tailwind CSS v4 (`apps/web/src/app/globals.css` imports it).
- Monorepo: pnpm workspaces + Turborepo. Shared types in
  `packages/shared-types`.
- Run: `pnpm dev` (web on http://localhost:3000). Verify with `pnpm typecheck`
  and `pnpm lint`.

## Look & feel

Clean and simple. Light theme: `bg-gray-50`, white cards (`rounded-xl border
border-gray-200 shadow-sm`), generous spacing, a centred `max-w-4xl` container,
a simple top nav. Mode times shown as a small icon + minutes. No heavy UI
library — plain Tailwind.

## Resolved defaults (open questions)

- A **Search** has an optional `nickname`; UI shows nickname if set, else the
  address.
- **Compare** is capped at **3** Searches at once (readable columns).
- **POI label** is free text, with `"Work"` pre-filled as the default suggestion
  in the add-POI form.

---

## 1. Domain types — `packages/shared-types/src/index.ts`

**Replace** the file's `Property`/`Address` listing types with the domain below.
Keep `ApiResponse<T>` / `ApiError` (harmless, future API use). Remove the
sample-listings code from `apps/web/src/app/page.tsx`.

```ts
export type TransportMode = "walk" | "transit" | "cycle" | "drive";

export type AmenityCategory =
  | "supermarket"
  | "transit_stop"
  | "pharmacy"
  | "park";

/** Travel time for one transport mode to one destination. */
export interface TravelStat {
  mode: TransportMode;
  minutes: number;
}

/** A single place shown in results (an amenity or an attached POI). */
export interface Destination {
  id: string;
  name: string;        // "Coles, King St" or a POI label like "Work"
  address?: string;
  travelStats: TravelStat[]; // one per selected mode
}

/** Nearest amenities for one category (nearest 3). */
export interface AmenityGroup {
  category: AmenityCategory;
  destinations: Destination[];
}

/** A reusable user point of interest in the POI library. */
export interface Poi {
  id: string;
  label: string;       // "Work", "Family", ...
  address: string;
}

/** A POI as captured inside a Search (snapshot + its computed stats). */
export interface AttachedPoi {
  poiId: string;
  label: string;
  address: string;
  travelStats: TravelStat[];
}

/** A folder grouping Searches in History (flat, optional). */
export interface Folder {
  id: string;
  name: string;
}

/** One evaluation of a candidate rental address. */
export interface Search {
  id: string;
  nickname?: string;
  address: string;
  modes: TransportMode[];
  amenityCategories: AmenityCategory[];
  amenityGroups: AmenityGroup[];
  pois: AttachedPoi[];
  folderId?: string;     // undefined = uncategorised
  createdAt: string;     // ISO-8601
}

export interface ApiResponse<T> {
  data: T;
}
export interface ApiError {
  error: string;
}
```

## 2. App structure — `apps/web/src`

```
app/
  layout.tsx              # html shell + <Nav/>, wraps children in <StoreProvider/>
  page.tsx                # "/" Search page (client)
  history/page.tsx        # "/history"
  pois/page.tsx           # "/pois"
  globals.css             # (exists) tailwind import
components/
  Nav.tsx                 # top nav: Search | History | POIs (active link styling)
  Spinner.tsx
  EmptyState.tsx          # icon + message + optional action
  SearchForm.tsx          # address, ModeSelector, AmenityCategorySelector, PoiAttachList, submit
  ModeSelector.tsx        # multi-toggle, min 1 enforced
  AmenityCategorySelector.tsx  # multi-toggle of the 4 categories
  PoiAttachList.tsx       # choose which library POIs to attach (+ quick add)
  ResultsView.tsx         # grouped cards: amenity sections + "Your POIs"
  DestinationCard.tsx     # name/address + TravelStat row (icon + minutes per mode)
  HistoryList.tsx         # rows of Searches, select-to-compare, delete, reopen
  FolderSidebar.tsx       # list folders incl. "All" / "Uncategorised"; create/rename/delete; filter
  CompareView.tsx         # up to 3 Searches side-by-side (reuses ResultsView per column)
  PoiManager.tsx          # list + add/edit/delete library POIs
lib/
  store.tsx               # React Context: searches, pois, folders + actions; seeded from fixtures
  fixtures.ts             # 2-3 seed Searches, a few POIs, 1-2 folders
  mockSearch.ts           # fake results generator + simulated latency
  format.ts               # MODE_META (label+icon), CATEGORY_META (label), formatMinutes
```

## 3. State — `lib/store.tsx`

- A single React Context provider (`StoreProvider`) holding in-memory state:
  `searches: Search[]`, `pois: Poi[]`, `folders: Folder[]`. Seed initial state
  from `fixtures.ts`. **No localStorage** — resetting on refresh is intended.
- Actions: `addSearch`, `deleteSearch`, `moveSearchToFolder`; `addPoi`,
  `updatePoi`, `deletePoi`; `addFolder`, `renameFolder`, `deleteFolder` (moving
  its Searches to uncategorised). Expose via a `useStore()` hook.
- Generate ids with `crypto.randomUUID()`.

## 4. Mock results — `lib/mockSearch.ts`

- `runSearch(input): Promise<Pick<Search, "amenityGroups" | "pois">>` where
  `input = { address, modes, amenityCategories, attachedPois: Poi[] }`.
- Simulate latency: `await new Promise(r => setTimeout(r, ~1200ms))` so the
  spinner is visible.
- For each selected category, generate **3** destinations with plausible names
  (keep small name pools per category) and a `TravelStat` for each selected
  mode. For each attached POI, generate one `AttachedPoi` with stats for each
  selected mode.
- Minutes must look realistic and consistent per place: pick a base distance,
  then derive `drive < cycle < transit < walk` (roughly). Keep it deterministic
  enough to look sane; randomness is fine.

## 5. Page behaviour

### Search (`/`)
- Render `SearchForm`. Validation (submit disabled until met): address
  non-empty, ≥1 mode, and (≥1 amenity category OR ≥1 attached POI).
- On submit: show `Spinner`, call `runSearch`, build a `Search`, `addSearch`,
  then render `ResultsView` below the form (or replace form with results + a
  "New search" button). Newly created Search is now in History.

### History (`/history`)
- `FolderSidebar` (left) + `HistoryList` (main). Sidebar filters by folder
  ("All", "Uncategorised", each folder). Create/rename/delete folders.
- Each row: nickname-or-address, date, a one-line summary (e.g. "3 modes · 4
  categories · 2 POIs"), a folder selector (move), a delete button, and click to
  **reopen** (modal or panel showing `ResultsView` for that Search).
- Multi-select up to 3 rows → "Compare" button → `CompareView`.
- Empty states: no Searches; no Searches in the selected folder.

### POIs (`/pois`)
- `PoiManager`: list of library POIs (label + address) with edit/delete, and an
  add form (label free-text defaulting to "Work", address text). Empty state
  when none.

## 6. Conventions / constraints

- TypeScript strict; functional components; prefer pure helpers in `lib/`.
- Import domain types from `@cribsearch/shared-types` (never redefine shapes).
- Client components (`"use client"`) where state/interactivity is needed; the
  store is client-side.
- Keep `CONTEXT.md` terminology in UI copy (Search, Amenity, POI, Folder).
- After changes: `pnpm typecheck` and `pnpm lint` must pass.

## 7. Suggested task order (commit in small reviewable chunks)

1. Replace `shared-types` domain types; gut `page.tsx` to a stub; typecheck green.
2. `lib/format.ts` + `lib/mockSearch.ts` + `lib/fixtures.ts` + `lib/store.tsx`
   with `StoreProvider`; wire provider in `layout.tsx`; add `Nav`.
3. Search page: `SearchForm` + selectors + validation + `Spinner` +
   `ResultsView` + `DestinationCard` (fake flow end-to-end).
4. History page: `HistoryList` + reopen + delete + empty states.
5. Folders: `FolderSidebar` + filter + move + folder CRUD.
6. Compare: `CompareView` (cap 3).
7. POIs page: `PoiManager` CRUD; wire `PoiAttachList` quick-add to the library.
8. Polish: empty states, responsive check, copy, final typecheck + lint.

## 8. Out of scope

Real Google Maps / geocoding, address autocomplete, persistence/DB, auth, the
`apps/api` backend, CI/CD. (Future: provider-driven amenity categories with
grouping; localStorage or API-backed persistence.)

## Acceptance

A user can: enter an address, pick modes + categories + POIs, see a spinner then
grouped results; find that Search in History; reopen it; organise Searches into
folders; compare up to 3 side-by-side; delete Searches; and manage a reusable
POI library. `pnpm typecheck` and `pnpm lint` pass.
```
