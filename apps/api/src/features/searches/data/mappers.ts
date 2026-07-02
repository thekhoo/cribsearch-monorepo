import type {
  AmenityCategory,
  AmenityGroup,
  AttachedPoi,
  Destination,
  Search,
  TravelStat,
} from "@cribsearch/shared-types";
import type { DestinationDbRow, DestinationInsert } from "./search-destinations";
import type { SearchRow } from "./searches";

// ── Travel stat <-> column helpers ────────────────────────────────────────────

interface TravelColumns {
  walkSeconds: number | null;
  walkMeters: number | null;
  transitSeconds: number | null;
  transitMeters: number | null;
  cycleSeconds: number | null;
  cycleMeters: number | null;
  driveSeconds: number | null;
  driveMeters: number | null;
}

const MODE_COLUMN_MAP = [
  { mode: "walk", secondsKey: "walkSeconds", metersKey: "walkMeters" },
  { mode: "transit", secondsKey: "transitSeconds", metersKey: "transitMeters" },
  { mode: "cycle", secondsKey: "cycleSeconds", metersKey: "cycleMeters" },
  { mode: "drive", secondsKey: "driveSeconds", metersKey: "driveMeters" },
] as const;

export const travelStatsToColumns = (stats: TravelStat[]): TravelColumns => {
  const result: TravelColumns = {
    walkSeconds: null,
    walkMeters: null,
    transitSeconds: null,
    transitMeters: null,
    cycleSeconds: null,
    cycleMeters: null,
    driveSeconds: null,
    driveMeters: null,
  };
  for (const stat of stats) {
    for (const entry of MODE_COLUMN_MAP) {
      if (entry.mode === stat.mode) {
        result[entry.secondsKey] = stat.seconds;
        result[entry.metersKey] = stat.meters;
        break;
      }
    }
  }
  return result;
};

export const columnsToTravelStats = (row: TravelColumns): TravelStat[] => {
  const stats: TravelStat[] = [];
  for (const { mode, secondsKey, metersKey } of MODE_COLUMN_MAP) {
    const seconds = row[secondsKey];
    if (seconds !== null) {
      stats.push({ mode, seconds, meters: row[metersKey] ?? 0 });
    }
  }
  return stats;
};

// ── Search → DestinationInsert[] ──────────────────────────────────────────────

export const searchToDestinationRows = (search: Search): DestinationInsert[] => {
  const rows: DestinationInsert[] = [];

  for (const group of search.amenityGroups) {
    for (const dest of group.destinations) {
      const cols = travelStatsToColumns(dest.travelStats);
      rows.push({
        category: group.category,
        name: dest.name,
        // address column is NOT NULL + UNIQUE per search; amenity destinations
        // from the maps provider may lack an address, so fall back to the domain id.
        address: dest.address ?? dest.id,
        ...cols,
        metadata: {
          destinationId: dest.id,
          hadAddress: dest.address !== undefined,
        },
      });
    }
  }

  for (const poi of search.pois) {
    const cols = travelStatsToColumns(poi.travelStats);
    rows.push({
      category: "poi",
      name: poi.label,
      address: poi.address,
      ...cols,
      metadata: { poiId: poi.poiId },
    });
  }

  return rows;
};

// ── (SearchRow, DestinationDbRow[]) → Search ──────────────────────────────────

export const rowsToSearch = (
  searchRow: SearchRow,
  destRows: DestinationDbRow[],
): Search => {
  const request = searchRow.request;

  const poiRows = destRows.filter((r) => r.category === "poi");
  const amenityRows = destRows.filter((r) => r.category !== "poi");

  // Group amenity rows by category preserving insertion order
  const groupMap = new Map<string, DestinationDbRow[]>();
  for (const row of amenityRows) {
    const existing = groupMap.get(row.category);
    if (existing) {
      existing.push(row);
    } else {
      groupMap.set(row.category, [row]);
    }
  }

  const amenityGroups: AmenityGroup[] = [];
  for (const [category, rows] of groupMap) {
    const destinations: Destination[] = rows.map((row) => {
      const destinationId =
        typeof row.metadata["destinationId"] === "string"
          ? row.metadata["destinationId"]
          : row.address;
      const hadAddress =
        typeof row.metadata["hadAddress"] === "boolean"
          ? row.metadata["hadAddress"]
          : true;
      return {
        id: destinationId,
        name: row.name,
        address: hadAddress ? row.address : undefined,
        travelStats: columnsToTravelStats(row),
      };
    });
    amenityGroups.push({
      category: category as AmenityCategory,
      destinations,
    });
  }

  const pois: AttachedPoi[] = poiRows.map((row) => {
    const poiId =
      typeof row.metadata["poiId"] === "string" ? row.metadata["poiId"] : row.address;
    return {
      poiId,
      label: row.name,
      address: row.address,
      travelStats: columnsToTravelStats(row),
    };
  });

  return {
    id: searchRow.searchId,
    searchName: searchRow.searchName ?? undefined,
    address: request.address,
    modes: request.modes,
    amenityCategories: request.amenityCategories,
    amenityGroups,
    pois,
    propertyDetails: searchRow.propertyDetails,
    createdAt: searchRow.createdAt,
  };
};
