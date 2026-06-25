import type {
  AmenityCategory,
  AmenityGroup,
  TransportMode,
  TravelStat,
} from "@cribsearch/shared-types";

export interface DestinationTravelResult {
  id: string;
  name: string;
  address: string;
  travelStats: TravelStat[];
}

export interface MapsProvider {
  findAmenities(
    address: string,
    categories: AmenityCategory[],
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
