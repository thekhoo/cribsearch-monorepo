import type {
  AmenityCategory,
  AmenityGroup,
  TransportMode,
  TravelStat,
} from "@homefinder/shared-types";
import type {
  DestinationTravelResult,
  MapsProvider,
} from "../ports/maps-provider";
import { MapsError } from "../ports/maps-provider";

export class StubMapsProvider implements MapsProvider {
  private amenityFailure: "permanent" | "transient" | null = null;
  private travelStatsFailure: "transient" | null = null;
  private readonly failingAddresses = new Set<string>();

  forceAmenityFailure(kind: "permanent" | "transient" | null): void {
    this.amenityFailure = kind;
  }

  forceTravelStatsFailure(kind: "transient" | null): void {
    this.travelStatsFailure = kind;
  }

  addFailingAddress(address: string): void {
    this.failingAddresses.add(address);
  }

  reset(): void {
    this.amenityFailure = null;
    this.travelStatsFailure = null;
    this.failingAddresses.clear();
  }

  async findAmenities(
    _address: string,
    categories: AmenityCategory[],
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
          travelStats: [],
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
        minutes: 10 + i,
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
