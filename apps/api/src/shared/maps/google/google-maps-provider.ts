import type {
  AmenityCategory,
  AmenityGroup,
  Destination,
  TransportMode,
  TravelStat,
} from "@cribsearch/shared-types";
import type { DestinationTravelResult, MapsProvider } from "../maps-provider";
import { MapsError } from "../maps-provider";
import { GoogleMapsClient } from "./google-maps-client";
import { toPlacesIncludedType } from "./mappers";
import type { GeoCoordinate } from "./types";

export class GoogleMapsProvider implements MapsProvider {
  constructor(private readonly client: GoogleMapsClient) {}

  async geocode(address: string): Promise<GeoCoordinate> {
    return this.client.geocode(address);
  }

  async computeTravelStats(
    fromAddress: string,
    destinations: { label: string; address: string }[],
    modes: TransportMode[],
  ): Promise<DestinationTravelResult[]> {
    const results: DestinationTravelResult[] = [];

    for (let i = 0; i < destinations.length; i++) {
      const dest = destinations[i]!;
      const travelStats: TravelStat[] = [];

      for (const mode of modes) {
        const { seconds, meters } = await this.client.directions({
          origin: fromAddress,
          destination: dest.address,
          mode,
        });
        travelStats.push({ mode, seconds, meters });
      }

      results.push({
        id: `dest-${String(i)}`,
        name: dest.label,
        address: dest.address,
        travelStats,
      });
    }

    return results;
  }

  async findAmenities(
    address: string,
    categories: AmenityCategory[],
    modes: TransportMode[],
  ): Promise<AmenityGroup[]> {
    const center = await this.client.geocode(address);
    const groups: AmenityGroup[] = [];

    for (const category of categories) {
      const places = await this.client.nearby({
        lat: center.lat,
        lng: center.lng,
        includedType: toPlacesIncludedType(category),
      });

      const destinations: Destination[] = [];

      for (const amenity of places) {
        try {
          const [result] = await this.computeTravelStats(
            address,
            [{ label: amenity.name, address: amenity.address }],
            modes,
          );
          const travelStats = result?.travelStats ?? [];
          destinations.push({
            id: amenity.id,
            name: amenity.name,
            address: amenity.address,
            travelStats,
          });
        } catch (err) {
          if (err instanceof MapsError && err.kind === "permanent") {
            // drop this amenity silently
            continue;
          }
          // transient errors propagate
          throw err;
        }
      }

      groups.push({ category, destinations });
    }

    return groups;
  }
}
