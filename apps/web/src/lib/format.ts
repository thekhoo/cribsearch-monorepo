import type {
  AmenityCategory,
  Price,
  PricePeriod,
  RequestStatus,
  TransportMode,
} from "@cribsearch/shared-types";

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

/** Presentation for each search status: a friendly label and Tailwind badge classes. */
export const STATUS_META: Record<
  RequestStatus,
  { label: string; badgeClass: string }
> = {
  Pending: { label: "Pending", badgeClass: "bg-gray-100 text-gray-600" },
  Processing: { label: "Processing", badgeClass: "bg-blue-100 text-blue-700" },
  Complete: { label: "Complete", badgeClass: "bg-green-100 text-green-700" },
  PartialFailure: {
    label: "Partial",
    badgeClass: "bg-amber-100 text-amber-700",
  },
  Failed: { label: "Failed", badgeClass: "bg-red-100 text-red-700" },
};

/** Friendly labels for the price period select. */
export const PERIOD_OPTIONS: { value: PricePeriod; label: string }[] = [
  { value: "pd", label: "per day (pd)" },
  { value: "pw", label: "per week (pw)" },
  { value: "pcm", label: "per calendar month (pcm)" },
  { value: "pa", label: "per annum (pa)" },
];

/**
 * Format a Price into a human-readable string, e.g. "€1,500 pcm".
 * Returns null when there is no amount (no chip should be shown).
 */
export function formatPrice(price?: Price): string | null {
  if (price?.amount == null) return null;

  let formatted: string;
  if (price.currency) {
    try {
      formatted = new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: price.currency,
        maximumFractionDigits: 0,
      }).format(price.amount);
    } catch {
      formatted =
        new Intl.NumberFormat(undefined, {
          maximumFractionDigits: 0,
        }).format(price.amount) +
        " " +
        price.currency;
    }
  } else {
    formatted = new Intl.NumberFormat(undefined, {
      maximumFractionDigits: 0,
    }).format(price.amount);
  }

  if (price.period) {
    formatted += ` ${price.period}`;
  }

  return formatted;
}

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
