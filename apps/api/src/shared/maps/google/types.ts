/**
 * Wire formats for the Google Maps web-service responses the client consumes,
 * plus the small result shapes the client returns to its callers. Kept separate
 * from the client so the request/response contracts are easy to find and reuse.
 */

// ── Raw API response shapes ───────────────────────────────────────────────────

/** Shared error envelope. Places API (New) returns `{ error: { status, message } }`. */
export interface GMapsErrorResponse {
  error?: { status?: string; message?: string };
}

export interface GMapsGeocodeResponse {
  status: string;
  results: Array<{ geometry: { location: { lat: number; lng: number } } }>;
}

export interface GMapsDirectionsResponse {
  status: string;
  routes: Array<{
    legs: Array<{
      duration: { value: number };
      distance: { value: number };
    }>;
  }>;
}

export interface GMapsPlacesNearbyResponse {
  places?: Array<{
    id: string;
    displayName?: { text?: string };
    formattedAddress?: string;
  }>;
}

// ── Request shapes ────────────────────────────────────────────────────────────

export interface GMapsPlacesNearbyRequest {
  includedTypes: string[];
  maxResultCount: number;
  locationRestriction: {
    circle: {
      center: { latitude: number; longitude: number };
      radius: number;
    };
  };
}

// ── Client result shapes ──────────────────────────────────────────────────────

export interface GeoCoordinate {
  lat: number;
  lng: number;
}

export interface DirectionsResult {
  /** Travel duration in seconds. */
  seconds: number;
  /** Travel distance in meters. */
  meters: number;
}

export interface NearbyPlace {
  id: string;
  name: string;
  address: string;
}
