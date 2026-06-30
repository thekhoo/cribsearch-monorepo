import type {
  AmenityCategory,
  AmenityGroup,
  TransportMode,
  TravelStat,
} from "@cribsearch/shared-types";
import type {
  DestinationTravelResult,
  MapsProvider,
} from "./maps-provider";
import { MapsError } from "./maps-provider";
import type { GeoCoordinate } from "./google/types";

export class StubMapsProvider implements MapsProvider {
  private amenityFailure: "permanent" | "transient" | null = null;
  private travelStatsFailure: "transient" | null = null;
  private geocodeFailure: "permanent" | "transient" | null = null;
  private readonly failingAddresses = new Set<string>();

  forceAmenityFailure(kind: "permanent" | "transient" | null): void {
    this.amenityFailure = kind;
  }

  forceTravelStatsFailure(kind: "transient" | null): void {
    this.travelStatsFailure = kind;
  }

  forceGeocodeFailure(kind: "permanent" | "transient" | null): void {
    this.geocodeFailure = kind;
  }

  addFailingAddress(address: string): void {
    this.failingAddresses.add(address);
  }

  reset(): void {
    this.amenityFailure = null;
    this.travelStatsFailure = null;
    this.geocodeFailure = null;
    this.failingAddresses.clear();
  }

  async geocode(_address: string): Promise<GeoCoordinate> {
    if (this.geocodeFailure === "permanent") {
      throw new MapsError("address not found", "permanent");
    }
    if (this.geocodeFailure === "transient") {
      throw new MapsError("provider timeout", "transient");
    }
    return { lat: -33.8688, lng: 151.2093 };
  }

  async findAmenities(
    _address: string,
    categories: AmenityCategory[],
    modes: TransportMode[],
  ): Promise<AmenityGroup[]> {
    if (this.amenityFailure === "permanent") {
      throw new MapsError("address not found", "permanent");
    }
    if (this.amenityFailure === "transient") {
      throw new MapsError("provider timeout", "transient");
    }

    return categories.map((category) => ({
      category,
      destinations: [
        {
          id: `${category}-1`,
          name: `Stub ${category}`,
          travelStats: modes.map((mode) => ({ mode, seconds: 600, meters: 1000 })),
        },
      ],
    }));
  }

  async computeTravelStats(
    _fromAddress: string,
    destinations: { label: string; address: string }[],
    modes: TransportMode[],
  ): Promise<DestinationTravelResult[]> {
    if (this.travelStatsFailure === "transient") {
      throw new MapsError("provider timeout", "transient");
    }

    return destinations.map((dest, i) => {
      if (this.failingAddresses.has(dest.address)) {
        throw new MapsError(
          `failed for destination: ${dest.label}`,
          "permanent",
        );
      }
      const travelStats: TravelStat[] = modes.map((mode) => ({
        mode,
        seconds: (10 + i) * 60,
        meters: (10 + i) * 100,
      }));
      return {
        id: `dest-${String(i)}`,
        name: dest.label,
        address: dest.address,
        travelStats,
      };
    });
  }
}
