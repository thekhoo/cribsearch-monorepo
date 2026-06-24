import type {
  AmenityCategory,
  AmenityGroup,
  AttachedPoi,
  Poi,
  TransportMode,
  TravelStat,
} from "@homefinder/shared-types";

const NAMES: Record<AmenityCategory, string[]> = {
  supermarket: ["Coles", "Woolworths", "Aldi"],
  transit_stop: ["Central Station", "Town Hall Stop", "King St Wharf Ferry"],
  pharmacy: ["Chemist Warehouse", "Priceline Pharmacy", "TerryWhite Chemmart"],
  park: ["Hyde Park", "Victoria Park", "Jubilee Park"],
};

interface SearchInput {
  address: string;
  modes: TransportMode[];
  amenityCategories: AmenityCategory[];
  attachedPois: Poi[];
}

function generateStats(modes: TransportMode[]): TravelStat[] {
  const baseMinutes = 5 + Math.random() * 25;
  const modeMultiplier: Record<TransportMode, number> = {
    drive: 0.4,
    cycle: 0.7,
    transit: 0.85,
    walk: 1.0,
  };
  return modes.map((mode) => ({
    mode,
    minutes: Math.round(baseMinutes * modeMultiplier[mode]),
  }));
}

export async function runSearch(
  input: SearchInput,
): Promise<{ amenityGroups: AmenityGroup[]; pois: AttachedPoi[] }> {
  await new Promise((r) => setTimeout(r, 1200));

  const amenityGroups: AmenityGroup[] = input.amenityCategories.map(
    (category) => ({
      category,
      destinations: NAMES[category].map((name, i) => ({
        id: crypto.randomUUID(),
        name,
        address: `${10 + i * 15} ${category === "park" ? "Park" : "Main"} St`,
        travelStats: generateStats(input.modes),
      })),
    }),
  );

  const pois: AttachedPoi[] = input.attachedPois.map((poi) => ({
    poiId: poi.id,
    label: poi.label,
    address: poi.address,
    travelStats: generateStats(input.modes),
  }));

  return { amenityGroups, pois };
}
