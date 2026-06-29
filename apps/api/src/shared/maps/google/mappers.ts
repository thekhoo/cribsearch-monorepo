import type { AmenityCategory, TransportMode } from "@cribsearch/shared-types";

export function toDirectionsMode(mode: TransportMode): string {
  switch (mode) {
    case "walk":
      return "walking";
    case "transit":
      return "transit";
    case "cycle":
      return "bicycling";
    case "drive":
      return "driving";
  }
}

export function toPlacesIncludedType(category: AmenityCategory): string {
  switch (category) {
    case "supermarket":
      return "supermarket";
    case "transit_stop":
      return "transit_station";
    case "pharmacy":
      return "pharmacy";
    case "park":
      return "park";
  }
}

export function classifyGoogleStatus(status: string): "transient" | "permanent" {
  switch (status) {
    case "OVER_QUERY_LIMIT":
    case "UNKNOWN_ERROR":
      return "transient";
    case "ZERO_RESULTS":
    case "NOT_FOUND":
    case "REQUEST_DENIED":
    case "INVALID_REQUEST":
      return "permanent";
    default:
      return "permanent";
  }
}
