import type {
  AmenityCategory,
  AmenityGroup,
  TransportMode,
  TravelStat,
} from "@cribsearch/shared-types";
import type { GeoCoordinate } from "./google/types";

export type { GeoCoordinate };

export interface DestinationTravelResult {
  id: string;
  name: string;
  address: string;
  travelStats: TravelStat[];
}

export interface MapsProvider {
  geocode(address: string): Promise<GeoCoordinate>;

  findAmenities(
    address: string,
    categories: AmenityCategory[],
    modes: TransportMode[],
  ): Promise<AmenityGroup[]>;

  computeTravelStats(
    fromAddress: string,
    destinations: { label: string; address: string }[],
    modes: TransportMode[],
  ): Promise<DestinationTravelResult[]>;
}

export class MapsError extends Error {
  constructor(
    message: string,
    public readonly kind: "transient" | "permanent",
  ) {
    super(message);
    this.name = "MapsError";
  }
}
