/**
 * Shared contracts between the web frontend and the API backend.
 * Keep this package free of runtime dependencies — types only.
 */

// ── Domain types (Cribsearch) ───────────────────────────────────────

export type TransportMode = "walk" | "transit" | "cycle" | "drive";

export type AmenityCategory =
  | "supermarket"
  | "transit_stop"
  | "pharmacy"
  | "park";

export interface TravelStat {
  mode: TransportMode;
  /** Travel duration in seconds. */
  seconds: number;
  /** Travel distance in meters. */
  meters: number;
}

export interface GeoCoordinate {
  lat: number;
  lng: number;
}

export interface Destination {
  id: string;
  name: string;
  address?: string;
  travelStats: TravelStat[];
}

export interface AmenityGroup {
  category: AmenityCategory;
  destinations: Destination[];
}

export interface Poi {
  id: string;
  label: string;
  address: string;
  geocode?: GeoCoordinate;
}

export interface AttachedPoi {
  poiId: string;
  label: string;
  address: string;
  travelStats: TravelStat[];
}

export interface CreatePoiRequest {
  label: string;
  address: string;
}

export interface UpdatePoiRequest {
  label: string;
  address: string;
}

export interface Folder {
  id: string;
  name: string;
}

export interface Search {
  id: string;
  nickname?: string;
  address: string;
  modes: TransportMode[];
  amenityCategories: AmenityCategory[];
  amenityGroups: AmenityGroup[];
  pois: AttachedPoi[];
  folderId?: string;
  createdAt: string;
}

export interface SearchSummary {
  id: string;
  status: RequestStatus;
  nickname?: string;
  address: string;
  folderId?: string;
  createdAt: string;
}

// ── Async Search ───────────────────────────────────────────────────

export type RequestStatus =
  | "Pending"
  | "Processing"
  | "Complete"
  | "PartialFailure"
  | "Failed";

export interface SearchRequest {
  address: string;
  modes: TransportMode[];
  amenityCategories: AmenityCategory[];
  pois: { label: string; address: string }[];
  nickname?: string;
}

export interface SearchResponse {
  id: string;
  status: RequestStatus;
  search?: Search;
  error?: string;
}

export interface SearchMessage extends SearchRequest {
  searchRequestId: string;
}

// ── Generic API envelopes ───────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
}

export interface ApiError {
  error: string;
}

// ── Legacy types (used by apps/api — will be removed with the API rewrite) ──

/** @deprecated Use domain types above. Kept only for apps/api compatibility. */
export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

/** @deprecated Use Search instead. Kept only for apps/api compatibility. */
export interface Property {
  id: string;
  title: string;
  description: string;
  priceCents: number;
  bedrooms: number;
  bathrooms: number;
  address: Address;
  createdAt: string;
}
