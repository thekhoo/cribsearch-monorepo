import { describe, it, expect, beforeEach } from "vitest";
import { withTransaction } from "../../shared/db/with-transaction";
import { insertSearch, getSearchRow } from "../../features/journey/data/searches";
import { processJourneyRequest } from "../../features/journey/service/process-journey-request";
import { getJourneyRequest } from "../../features/journey/service/get-journey-request";
import type { JourneySearchMessage, JourneySearchRequest } from "@cribsearch/shared-types";
import { maps } from "../../shared/maps";
import { truncateAll } from "./db-helpers";

const baseBody: JourneySearchRequest = {
  address: "123 Main St, Sydney",
  modes: ["walk"],
  amenityCategories: ["supermarket"],
  pois: [{ label: "Work", address: "456 Office St" }],
};

/** Insert a pending row and return its id. */
const insertPending = async (): Promise<string> => {
  const { searchId: id } = await withTransaction((client) => insertSearch(client, baseBody));
  return id;
};

/** Build a full message from a pending id. */
const buildMsg = (id: string): JourneySearchMessage => ({
  ...baseBody,
  journeyRequestId: id,
});

describe("worker integration", () => {
  beforeEach(async () => {
    maps.reset();
    await truncateAll();
  });

  it("happy path → status Complete, search defined, amenityGroups present, one poi", async () => {
    const id = await insertPending();
    await processJourneyRequest(buildMsg(id));

    const view = await getJourneyRequest(id);
    expect(view).not.toBeNull();
    expect(view!.status).toBe("Complete");
    expect(view!.search).toBeDefined();
    expect(view!.search!.address).toBe(baseBody.address);
    expect(view!.search!.amenityGroups.length).toBeGreaterThan(0);
    expect(view!.search!.pois).toHaveLength(1);
    expect(view!.search!.pois[0]!.label).toBe("Work");
    expect(view!.error).toBeUndefined();
  });

  it("permanent amenity failure → status Failed, error matches /address not found/i, no search", async () => {
    maps.forceAmenityFailure("permanent");
    const id = await insertPending();
    await processJourneyRequest(buildMsg(id));

    const view = await getJourneyRequest(id);
    expect(view).not.toBeNull();
    expect(view!.status).toBe("Failed");
    expect(view!.search).toBeUndefined();
    expect(view!.error).toMatch(/address not found/i);
  });

  it("failing poi address → status PartialFailure, search defined, pois empty, amenityGroups present, error defined", async () => {
    maps.addFailingAddress("456 Office St");
    const id = await insertPending();
    await processJourneyRequest(buildMsg(id));

    const view = await getJourneyRequest(id);
    expect(view).not.toBeNull();
    expect(view!.status).toBe("PartialFailure");
    expect(view!.search).toBeDefined();
    expect(view!.search!.pois).toHaveLength(0);
    expect(view!.search!.amenityGroups.length).toBeGreaterThan(0);
    expect(view!.error).toBeDefined();
  });

  it("transient amenity failure → processJourneyRequest rejects with /provider timeout/, row stays Processing", async () => {
    maps.forceAmenityFailure("transient");
    const id = await insertPending();

    await expect(processJourneyRequest(buildMsg(id))).rejects.toThrow(
      /provider timeout/i,
    );

    const row = await withTransaction((client) => getSearchRow(client, id));
    expect(row!.status).toBe("Processing");
  });

  it("already-terminal row → processJourneyRequest is a no-op, status stays Complete", async () => {
    const id = await insertPending();
    // First process to get to Complete
    await processJourneyRequest(buildMsg(id));

    const viewBefore = await getJourneyRequest(id);
    expect(viewBefore!.status).toBe("Complete");

    // Force a failure on a second call — if it were not a no-op it would flip status
    maps.forceAmenityFailure("permanent");
    await processJourneyRequest(buildMsg(id));

    const viewAfter = await getJourneyRequest(id);
    expect(viewAfter!.status).toBe("Complete");
  });

  it("request with pois:[] → Complete, pois empty, amenityGroups present", async () => {
    const requestNoPois: JourneySearchRequest = {
      ...baseBody,
      pois: [],
    };
    const { searchId: id } = await withTransaction((client) =>
      insertSearch(client, requestNoPois),
    );
    const msg: JourneySearchMessage = { ...requestNoPois, journeyRequestId: id };

    await processJourneyRequest(msg);

    const view = await getJourneyRequest(id);
    expect(view).not.toBeNull();
    expect(view!.status).toBe("Complete");
    expect(view!.search!.pois).toHaveLength(0);
    expect(view!.search!.amenityGroups.length).toBeGreaterThan(0);
  });

  it("transient travel stats failure → rejects with /provider timeout/, row stays Processing", async () => {
    maps.forceTravelStatsFailure("transient");
    const id = await insertPending();

    await expect(processJourneyRequest(buildMsg(id))).rejects.toThrow(
      /provider timeout/i,
    );

    const row = await withTransaction((client) => getSearchRow(client, id));
    expect(row!.status).toBe("Processing");
  });
});
