import { describe, it, expect } from "vitest";
import {
  searchToDestinationRows,
  rowsToSearch,
  travelStatsToColumns,
  columnsToTravelStats,
} from "../features/searches/data/mappers";
import type { Search } from "@cribsearch/shared-types";
import type { DestinationDbRow } from "../features/searches/data/search-destinations";
import type { SearchRow } from "../features/searches/data/searches";

// ── Fixtures ─────────────────────────────────────────────────────────────────

const baseSearchRow: SearchRow = {
  searchId: "search-uuid-1",
  status: "Complete",
  request: {
    address: "1 Test St, Sydney",
    modes: ["walk", "transit"],
    amenityCategories: ["supermarket"],
    pois: [{ label: "Office", address: "2 Work St" }],
    nickname: "My Search",
  },
  statusReason: null,
  createdAt: "2024-01-01T00:00:00.000Z",
};

// ── travelStatsToColumns ─────────────────────────────────────────────────────

describe("travelStatsToColumns", () => {
  it("maps each mode to its column", () => {
    const result = travelStatsToColumns([
      { mode: "walk", seconds: 300, meters: 500 },
      { mode: "transit", seconds: 720, meters: 1200 },
      { mode: "cycle", seconds: 480, meters: 800 },
      { mode: "drive", seconds: 180, meters: 300 },
    ]);
    expect(result).toEqual({
      walkSeconds: 300,
      walkMeters: 500,
      transitSeconds: 720,
      transitMeters: 1200,
      cycleSeconds: 480,
      cycleMeters: 800,
      driveSeconds: 180,
      driveMeters: 300,
    });
  });

  it("leaves absent modes as null", () => {
    const result = travelStatsToColumns([{ mode: "walk", seconds: 600, meters: 1000 }]);
    expect(result).toEqual({
      walkSeconds: 600,
      walkMeters: 1000,
      transitSeconds: null,
      transitMeters: null,
      cycleSeconds: null,
      cycleMeters: null,
      driveSeconds: null,
      driveMeters: null,
    });
  });

  it("returns all nulls for empty stats", () => {
    expect(travelStatsToColumns([])).toEqual({
      walkSeconds: null,
      walkMeters: null,
      transitSeconds: null,
      transitMeters: null,
      cycleSeconds: null,
      cycleMeters: null,
      driveSeconds: null,
      driveMeters: null,
    });
  });
});

// ── columnsToTravelStats ──────────────────────────────────────────────────────

describe("columnsToTravelStats", () => {
  it("produces stats only for non-null columns in fixed order", () => {
    const stats = columnsToTravelStats({
      walkSeconds: 300,
      walkMeters: 500,
      transitSeconds: null,
      transitMeters: null,
      cycleSeconds: 480,
      cycleMeters: 800,
      driveSeconds: null,
      driveMeters: null,
    });
    expect(stats).toEqual([
      { mode: "walk", seconds: 300, meters: 500 },
      { mode: "cycle", seconds: 480, meters: 800 },
    ]);
  });

  it("coalesces null meters to 0 when seconds is present", () => {
    const stats = columnsToTravelStats({
      walkSeconds: 300,
      walkMeters: null,
      transitSeconds: null,
      transitMeters: null,
      cycleSeconds: null,
      cycleMeters: null,
      driveSeconds: null,
      driveMeters: null,
    });
    expect(stats).toEqual([{ mode: "walk", seconds: 300, meters: 0 }]);
  });

  it("returns empty array when all columns are null", () => {
    const stats = columnsToTravelStats({
      walkSeconds: null,
      walkMeters: null,
      transitSeconds: null,
      transitMeters: null,
      cycleSeconds: null,
      cycleMeters: null,
      driveSeconds: null,
      driveMeters: null,
    });
    expect(stats).toEqual([]);
  });
});

// ── searchToDestinationRows ──────────────────────────────────────────────────

describe("searchToDestinationRows", () => {
  it("produces correct row for amenity destination WITHOUT address (falls back to id)", () => {
    const search: Search = {
      id: "search-1",
      address: "1 Test St",
      modes: ["walk"],
      amenityCategories: ["supermarket"],
      amenityGroups: [
        {
          category: "supermarket",
          destinations: [
            {
              id: "supermarket-1",
              name: "Coles",
              // no address — should fall back to id
              travelStats: [],
            },
          ],
        },
      ],
      pois: [],
      createdAt: "2024-01-01T00:00:00.000Z",
    };

    const rows = searchToDestinationRows(search);
    expect(rows).toHaveLength(1);
    const row = rows[0]!;
    expect(row.category).toBe("supermarket");
    expect(row.name).toBe("Coles");
    expect(row.address).toBe("supermarket-1"); // fell back to id
    expect(row.walkSeconds).toBeNull();
    expect(row.walkMeters).toBeNull();
    expect(row.transitSeconds).toBeNull();
    expect(row.transitMeters).toBeNull();
    expect(row.cycleSeconds).toBeNull();
    expect(row.cycleMeters).toBeNull();
    expect(row.driveSeconds).toBeNull();
    expect(row.driveMeters).toBeNull();
    expect(row.metadata).toEqual({ destinationId: "supermarket-1", hadAddress: false });
  });

  it("produces correct row for amenity destination WITH address", () => {
    const search: Search = {
      id: "search-1",
      address: "1 Test St",
      modes: ["walk"],
      amenityCategories: ["supermarket"],
      amenityGroups: [
        {
          category: "supermarket",
          destinations: [
            {
              id: "supermarket-1",
              name: "Coles",
              address: "10 Supermarket Ave",
              travelStats: [{ mode: "walk", seconds: 420, meters: 700 }],
            },
          ],
        },
      ],
      pois: [],
      createdAt: "2024-01-01T00:00:00.000Z",
    };

    const rows = searchToDestinationRows(search);
    expect(rows).toHaveLength(1);
    const row = rows[0]!;
    expect(row.address).toBe("10 Supermarket Ave");
    expect(row.walkSeconds).toBe(420);
    expect(row.walkMeters).toBe(700);
    expect(row.metadata).toEqual({ destinationId: "supermarket-1", hadAddress: true });
  });

  it("produces correct poi row", () => {
    const search: Search = {
      id: "search-1",
      address: "1 Test St",
      modes: ["walk"],
      amenityCategories: [],
      amenityGroups: [],
      pois: [
        {
          poiId: "poi-42",
          label: "Office",
          address: "2 Work St",
          travelStats: [{ mode: "walk", seconds: 900, meters: 1500 }],
        },
      ],
      createdAt: "2024-01-01T00:00:00.000Z",
    };

    const rows = searchToDestinationRows(search);
    expect(rows).toHaveLength(1);
    const row = rows[0]!;
    expect(row.category).toBe("poi");
    expect(row.name).toBe("Office");
    expect(row.address).toBe("2 Work St");
    expect(row.walkSeconds).toBe(900);
    expect(row.walkMeters).toBe(1500);
    expect(row.metadata).toEqual({ poiId: "poi-42" });
  });

  it("produces zero rows for empty amenityGroups and pois", () => {
    const search: Search = {
      id: "search-1",
      address: "1 Test St",
      modes: ["walk"],
      amenityCategories: [],
      amenityGroups: [],
      pois: [],
      createdAt: "2024-01-01T00:00:00.000Z",
    };
    expect(searchToDestinationRows(search)).toEqual([]);
  });
});

// ── rowsToSearch ─────────────────────────────────────────────────────────────

describe("rowsToSearch", () => {
  it("reconstructs amenity destination WITHOUT address (hadAddress=false → address undefined)", () => {
    const destRows: DestinationDbRow[] = [
      {
        category: "supermarket",
        name: "Coles",
        address: "supermarket-1", // stored id as fallback
        walkSeconds: null,
        walkMeters: null,
        transitSeconds: null,
        transitMeters: null,
        cycleSeconds: null,
        cycleMeters: null,
        driveSeconds: null,
        driveMeters: null,
        metadata: { destinationId: "supermarket-1", hadAddress: false },
      },
    ];

    const result = rowsToSearch(baseSearchRow, destRows);
    expect(result.amenityGroups).toHaveLength(1);
    const group = result.amenityGroups[0]!;
    expect(group.category).toBe("supermarket");
    expect(group.destinations).toHaveLength(1);
    const dest = group.destinations[0]!;
    expect(dest.id).toBe("supermarket-1");
    expect(dest.name).toBe("Coles");
    expect(dest.address).toBeUndefined(); // restored correctly
    expect(dest.travelStats).toEqual([]);
  });

  it("reconstructs amenity destination WITH address surviving round-trip", () => {
    const search: Search = {
      id: "search-uuid-1",
      address: "1 Test St, Sydney",
      modes: ["walk"],
      amenityCategories: ["supermarket"],
      amenityGroups: [
        {
          category: "supermarket",
          destinations: [
            {
              id: "supermarket-1",
              name: "Coles",
              address: "10 Supermarket Ave",
              travelStats: [{ mode: "walk", seconds: 420, meters: 700 }],
            },
          ],
        },
      ],
      pois: [],
      createdAt: "2024-01-01T00:00:00.000Z",
    };

    const insertRows = searchToDestinationRows(search);
    // Simulate a DB read: convert DestinationInsert → DestinationDbRow (identical shape)
    const dbRows: DestinationDbRow[] = insertRows.map((r) => ({ ...r }));

    const searchRow: SearchRow = {
      searchId: search.id,
      status: "Complete",
      request: {
        address: search.address,
        modes: search.modes,
        amenityCategories: search.amenityCategories,
        pois: [],
      },
      statusReason: null,
      createdAt: search.createdAt,
    };

    const result = rowsToSearch(searchRow, dbRows);
    const dest = result.amenityGroups[0]?.destinations[0];
    expect(dest?.address).toBe("10 Supermarket Ave");
    expect(dest?.travelStats).toEqual([{ mode: "walk", seconds: 420, meters: 700 }]);
  });

  it("reconstructs a POI correctly", () => {
    const destRows: DestinationDbRow[] = [
      {
        category: "poi",
        name: "Office",
        address: "2 Work St",
        walkSeconds: 900,
        walkMeters: 1500,
        transitSeconds: null,
        transitMeters: null,
        cycleSeconds: null,
        cycleMeters: null,
        driveSeconds: null,
        driveMeters: null,
        metadata: { poiId: "poi-42" },
      },
    ];

    const result = rowsToSearch(baseSearchRow, destRows);
    expect(result.pois).toHaveLength(1);
    const poi = result.pois[0]!;
    expect(poi.poiId).toBe("poi-42");
    expect(poi.label).toBe("Office");
    expect(poi.address).toBe("2 Work St");
    expect(poi.travelStats).toEqual([{ mode: "walk", seconds: 900, meters: 1500 }]);
  });

  it("full round-trip: Search → DestinationInsert[] → DestinationDbRow[] → Search", () => {
    const original: Search = {
      id: "search-uuid-1",
      address: "1 Test St, Sydney",
      nickname: "My Search",
      modes: ["walk", "transit"],
      amenityCategories: ["supermarket"],
      amenityGroups: [
        {
          category: "supermarket",
          destinations: [
            {
              // Without address: falls back to id
              id: "supermarket-1",
              name: "Coles",
              travelStats: [],
            },
          ],
        },
      ],
      pois: [
        {
          poiId: "poi-42",
          label: "Office",
          address: "2 Work St",
          travelStats: [{ mode: "walk", seconds: 900, meters: 1500 }],
        },
      ],
      createdAt: "2024-01-01T00:00:00.000Z",
    };

    const insertRows = searchToDestinationRows(original);
    const dbRows: DestinationDbRow[] = insertRows.map((r) => ({ ...r }));

    const searchRow: SearchRow = {
      searchId: original.id,
      status: "Complete",
      request: {
        address: original.address,
        modes: original.modes,
        amenityCategories: original.amenityCategories,
        pois: original.pois.map((p) => ({ label: p.label, address: p.address })),
        nickname: original.nickname,
      },
      statusReason: null,
      createdAt: original.createdAt,
    };

    const reconstructed = rowsToSearch(searchRow, dbRows);

    // Top-level fields
    expect(reconstructed.id).toBe(original.id);
    expect(reconstructed.nickname).toBe(original.nickname);
    expect(reconstructed.address).toBe(original.address);
    expect(reconstructed.modes).toEqual(original.modes);
    expect(reconstructed.amenityCategories).toEqual(original.amenityCategories);
    expect(reconstructed.createdAt).toBe(original.createdAt);

    // Amenity group (destination without address: address should be undefined)
    expect(reconstructed.amenityGroups).toHaveLength(1);
    const group = reconstructed.amenityGroups[0]!;
    expect(group.category).toBe("supermarket");
    const dest = group.destinations[0]!;
    expect(dest.id).toBe("supermarket-1");
    expect(dest.name).toBe("Coles");
    expect(dest.address).toBeUndefined();
    expect(dest.travelStats).toEqual([]);

    // POI
    expect(reconstructed.pois).toHaveLength(1);
    const poi = reconstructed.pois[0]!;
    expect(poi.poiId).toBe("poi-42");
    expect(poi.label).toBe("Office");
    expect(poi.address).toBe("2 Work St");
    expect(poi.travelStats).toEqual([{ mode: "walk", seconds: 900, meters: 1500 }]);
  });

  it("empty pois and amenityGroups → empty results", () => {
    const result = rowsToSearch(baseSearchRow, []);
    expect(result.amenityGroups).toEqual([]);
    expect(result.pois).toEqual([]);
  });
});
