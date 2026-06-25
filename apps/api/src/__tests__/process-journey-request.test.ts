import { describe, it, expect, beforeEach } from "vitest";
import { processJourneyRequest } from "../services/process-journey-request";
import { InMemoryJourneyRepository } from "../adapters/in-memory-journey-repository";
import { StubMapsProvider } from "../adapters/stub-maps-provider";
import type { JourneySearchMessage } from "@cribsearch/shared-types";

const baseMsg: Omit<JourneySearchMessage, "journeyRequestId"> = {
  address: "123 Main St, Sydney",
  modes: ["walk"],
  amenityCategories: ["supermarket"],
  pois: [{ label: "Work", address: "456 Office St" }],
};

describe("processJourneyRequest", () => {
  let repo: InMemoryJourneyRepository;
  let maps: StubMapsProvider;
  let requestId: string;

  beforeEach(async () => {
    repo = new InMemoryJourneyRepository();
    maps = new StubMapsProvider();
    const { id } = await repo.create(baseMsg);
    requestId = id;
  });

  const msg = (): JourneySearchMessage => ({
    ...baseMsg,
    journeyRequestId: requestId,
  });

  it("happy path → Complete with populated search", async () => {
    await processJourneyRequest(msg(), { repo, maps });

    const stored = await repo.getById(requestId);
    expect(stored!.status).toBe("Complete");
    expect(stored!.search).toBeDefined();
    expect(stored!.search!.address).toBe(baseMsg.address);
    expect(stored!.search!.modes).toEqual(baseMsg.modes);
    expect(stored!.search!.amenityGroups.length).toBeGreaterThan(0);
    expect(stored!.search!.pois.length).toBe(1);
    expect(stored!.search!.pois[0]!.label).toBe("Work");
    expect(stored!.error).toBeUndefined();
  });

  it("forced permanent amenity error → Failed", async () => {
    maps.forceAmenityFailure("permanent");

    await processJourneyRequest(msg(), { repo, maps });

    const stored = await repo.getById(requestId);
    expect(stored!.status).toBe("Failed");
    expect(stored!.error).toMatch(/address not found/i);
    expect(stored!.search).toBeUndefined();
  });

  it("forced partial POI failure → PartialFailure with partial search", async () => {
    maps.addFailingAddress("456 Office St");

    await processJourneyRequest(msg(), { repo, maps });

    const stored = await repo.getById(requestId);
    expect(stored!.status).toBe("PartialFailure");
    expect(stored!.search).toBeDefined();
    expect(stored!.search!.amenityGroups.length).toBeGreaterThan(0);
    expect(stored!.search!.pois.length).toBe(0);
    expect(stored!.error).toBeDefined();
  });

  it("forced transient amenity error → throws and row stays Processing", async () => {
    maps.forceAmenityFailure("transient");

    await expect(processJourneyRequest(msg(), { repo, maps })).rejects.toThrow(
      "provider timeout",
    );

    const stored = await repo.getById(requestId);
    expect(stored!.status).toBe("Processing");
  });

  it("already-terminal request → no-op", async () => {
    await repo.markProcessing(requestId);
    await repo.saveResult(requestId, "Complete", {
      id: "s-1",
      address: baseMsg.address,
      modes: baseMsg.modes,
      amenityCategories: baseMsg.amenityCategories,
      amenityGroups: [],
      pois: [],
      createdAt: new Date().toISOString(),
    });

    await processJourneyRequest(msg(), { repo, maps });

    const stored = await repo.getById(requestId);
    expect(stored!.status).toBe("Complete");
  });

  it("request with only amenity categories and no POIs → Complete", async () => {
    const noPoisMsg: JourneySearchMessage = {
      ...baseMsg,
      pois: [],
      journeyRequestId: requestId,
    };

    await processJourneyRequest(noPoisMsg, { repo, maps });

    const stored = await repo.getById(requestId);
    expect(stored!.status).toBe("Complete");
    expect(stored!.search!.pois.length).toBe(0);
    expect(stored!.search!.amenityGroups.length).toBeGreaterThan(0);
  });

  it("forced transient travel stats error → throws and row stays Processing", async () => {
    maps.forceTravelStatsFailure("transient");

    await expect(processJourneyRequest(msg(), { repo, maps })).rejects.toThrow(
      "provider timeout",
    );

    const stored = await repo.getById(requestId);
    expect(stored!.status).toBe("Processing");
  });
});
