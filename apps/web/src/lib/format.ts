import type { AmenityCategory, TransportMode } from "@cribsearch/shared-types";

export const MODE_META: Record<TransportMode, { label: string; icon: string }> = {
  walk: { label: "Walk", icon: "🚶" },
  transit: { label: "Transit", icon: "🚌" },
  cycle: { label: "Cycle", icon: "🚲" },
  drive: { label: "Drive", icon: "🚗" },
};

export const CATEGORY_META: Record<AmenityCategory, { label: string }> = {
  supermarket: { label: "Supermarkets" },
  transit_stop: { label: "Public Transport Stops" },
  pharmacy: { label: "Pharmacies" },
  park: { label: "Parks" },
};

/** Formats a travel duration given in seconds, e.g. "5 min", "<1 min". */
export function formatDuration(seconds: number): string {
  const minutes = seconds / 60;
  if (minutes < 1) return "<1 min";
  return `${Math.round(minutes)} min`;
}

/** Formats a travel distance given in meters, e.g. "800 m", "1.2 km". */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}
