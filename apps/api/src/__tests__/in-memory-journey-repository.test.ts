import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryJourneyRepository } from "../adapters/in-memory-journey-repository";
import type { JourneySearchRequest, Search } from "@cribsearch/shared-types";

const sampleRequest: JourneySearchRequest = {
  address: "123 Main St, Sydney",
  modes: ["walk"],
  amenityCategories: ["supermarket"],
  pois: [],
};

const sampleSearch: Search = {
  id: "search-1",
  address: "123 Main St, Sydney",
  modes: ["walk"],
  amenityCategories: ["supermarket"],
  amenityGroups: [
    {
      category: "supermarket",
      destinations: [
        {
          id: "d-1",
          name: "Coles",
          travelStats: [{ mode: "walk", minutes: 5 }],
        },
      ],
    },
  ],
  pois: [],
  createdAt: new Date().toISOString(),
};

describe("InMemoryJourneyRepository", () => {
  let repo: InMemoryJourneyRepository;

  beforeEach(() => {
    repo = new InMemoryJourneyRepository();
  });

  it("creates a pending request and returns id + status", async () => {
    const result = await repo.create(sampleRequest);
    expect(result.status).toBe("Pending");
    expect(typeof result.id).toBe("string");
    expect(result.id.length).toBeGreaterThan(0);
  });

  it("retrieves a created request by id", async () => {
    const { id } = await repo.create(sampleRequest);
    const stored = await repo.getById(id);
    expect(stored).not.toBeNull();
    expect(stored!.id).toBe(id);
    expect(stored!.status).toBe("Pending");
    expect(stored!.request).toEqual(sampleRequest);
  });

  it("returns null for unknown id", async () => {
    const stored = await repo.getById("nonexistent");
    expect(stored).toBeNull();
  });

  it("marks a request as Processing", async () => {
    const { id } = await repo.create(sampleRequest);
    await repo.markProcessing(id);
    const stored = await repo.getById(id);
    expect(stored!.status).toBe("Processing");
  });

  it("saves a Complete result with search", async () => {
    const { id } = await repo.create(sampleRequest);
    await repo.markProcessing(id);
    await repo.saveResult(id, "Complete", sampleSearch);
    const stored = await repo.getById(id);
    expect(stored!.status).toBe("Complete");
    expect(stored!.search).toEqual(sampleSearch);
    expect(stored!.error).toBeUndefined();
  });

  it("saves a Failed result with error", async () => {
    const { id } = await repo.create(sampleRequest);
    await repo.markProcessing(id);
    await repo.saveResult(id, "Failed", undefined, "address not found");
    const stored = await repo.getById(id);
    expect(stored!.status).toBe("Failed");
    expect(stored!.error).toBe("address not found");
    expect(stored!.search).toBeUndefined();
  });

  it("saves a PartialFailure with both search and error", async () => {
    const { id } = await repo.create(sampleRequest);
    await repo.markProcessing(id);
    await repo.saveResult(
      id,
      "PartialFailure",
      sampleSearch,
      "1 destination failed",
    );
    const stored = await repo.getById(id);
    expect(stored!.status).toBe("PartialFailure");
    expect(stored!.search).toEqual(sampleSearch);
    expect(stored!.error).toBe("1 destination failed");
  });
});
