import { describe, it, expect, beforeEach } from "vitest";
import { withTransaction } from "../../shared/db/with-transaction";
import { insertSearch, markProcessing, updateResult, getSearchRow } from "../../features/searches/data/searches";
import { insertDestinations, getDestinations } from "../../features/searches/data/search-destinations";
import { searchToDestinationRows, rowsToSearch } from "../../features/searches/data/mappers";
import type { SearchRequest, Search } from "@cribsearch/shared-types";
import { truncateAll } from "./db-helpers";

const DEV_USER_ID = "00000000-0000-0000-0000-000000000001";

const baseRequest: SearchRequest = {
  address: "123 Main St, Sydney",
  modes: ["walk"],
  amenityCategories: ["supermarket"],
  pois: [{ label: "Work", address: "456 Office St" }],
  nickname: "Test search",
};

describe("data layer integration", () => {
  beforeEach(truncateAll);

  it("insertSearch then getSearchRow round-trips the request", async () => {
    const { searchId: id, status } = await withTransaction((client) =>
      insertSearch(client, DEV_USER_ID, baseRequest),
    );

    expect(status).toBe("Pending");
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);

    const row = await withTransaction((client) => getSearchRow(client, id));

    expect(row).not.toBeNull();
    expect(row!.searchId).toBe(id);
    expect(row!.status).toBe("Pending");
    expect(row!.request).toEqual(baseRequest);
    // createdAt should be a valid ISO string
    expect(typeof row!.createdAt).toBe("string");
    expect(() => new Date(row!.createdAt)).not.toThrow();
    expect(new Date(row!.createdAt).toISOString()).toBe(row!.createdAt);
  });

  it("markProcessing flips status to Processing", async () => {
    const { searchId: id } = await withTransaction((client) =>
      insertSearch(client, DEV_USER_ID, baseRequest),
    );

    await withTransaction((client) => markProcessing(client, id));

    const row = await withTransaction((client) => getSearchRow(client, id));
    expect(row!.status).toBe("Processing");
  });

  it("updateResult + insertDestinations + getDestinations + rowsToSearch round-trips correctly", async () => {
    const { searchId: id } = await withTransaction((client) =>
      insertSearch(client, DEV_USER_ID, baseRequest),
    );
    await withTransaction((client) => markProcessing(client, id));

    // Build a search with amenity (no address) + poi (with address)
    const search: Search = {
      id,
      address: baseRequest.address,
      modes: baseRequest.modes,
      amenityCategories: baseRequest.amenityCategories,
      amenityGroups: [
        {
          category: "supermarket",
          destinations: [
            {
              id: "supermarket-1",
              name: "Stub supermarket",
              // no address — falls back to id in storage
              travelStats: [{ mode: "walk", seconds: 300, meters: 500 }],
            },
          ],
        },
      ],
      pois: [
        {
          poiId: "dest-0",
          label: "Work",
          address: "456 Office St",
          travelStats: [{ mode: "walk", seconds: 600, meters: 1000 }],
        },
      ],
      createdAt: new Date().toISOString(),
    };

    const destinationRows = searchToDestinationRows(search);

    await withTransaction(async (client) => {
      await updateResult(client, id, "Complete");
      await insertDestinations(client, id, destinationRows);
    });

    const searchRow = await withTransaction((client) => getSearchRow(client, id));
    expect(searchRow).not.toBeNull();
    expect(searchRow!.status).toBe("Complete");

    const destRows = await withTransaction((client) => getDestinations(client, id));

    // Reconstruct and verify
    const reconstructed = rowsToSearch(searchRow!, destRows);

    // Amenity group: no address → address undefined restored
    expect(reconstructed.amenityGroups).toHaveLength(1);
    const group = reconstructed.amenityGroups[0]!;
    expect(group.category).toBe("supermarket");
    expect(group.destinations).toHaveLength(1);
    const dest = group.destinations[0]!;
    expect(dest.id).toBe("supermarket-1");
    expect(dest.address).toBeUndefined();
    expect(dest.travelStats).toEqual([{ mode: "walk", seconds: 300, meters: 500 }]);

    // POI: address preserved
    expect(reconstructed.pois).toHaveLength(1);
    const poi = reconstructed.pois[0]!;
    expect(poi.label).toBe("Work");
    expect(poi.address).toBe("456 Office St");
    expect(poi.travelStats).toEqual([{ mode: "walk", seconds: 600, meters: 1000 }]);
  });

  it("getSearchRow returns null for a non-uuid id (22P02 guard)", async () => {
    const row = await withTransaction((client) =>
      getSearchRow(client, "not-a-uuid"),
    );
    expect(row).toBeNull();
  });
});
