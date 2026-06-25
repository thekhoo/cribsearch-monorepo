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

export function formatMinutes(minutes: number): string {
  if (minutes < 1) return "<1 min";
  return `${Math.round(minutes)} min`;
}
