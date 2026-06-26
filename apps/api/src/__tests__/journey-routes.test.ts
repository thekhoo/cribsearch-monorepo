import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import { InMemoryJourneyRepository } from "../adapters/in-memory-journey-repository";
import { InProcessJourneyQueue } from "../adapters/in-process-journey-queue";
import { StubMapsProvider } from "../shared/maps/stub-maps-provider";
import type { Ports } from "../composition";
import type {
  JourneySearchRequest,
  JourneySearchResponse,
} from "@cribsearch/shared-types";

const validRequest: JourneySearchRequest = {
  address: "123 Main St, Sydney",
  modes: ["walk"],
  amenityCategories: ["supermarket"],
  pois: [{ label: "Work", address: "456 Office St" }],
};

describe("journey routes integration", () => {
  let ports: Ports;
  let maps: StubMapsProvider;

  beforeEach(() => {
    const repo = new InMemoryJourneyRepository();
    maps = new StubMapsProvider();
    const queue = new InProcessJourneyQueue(repo, maps);
    ports = { repo, queue, maps };
  });

  const app = () => createApp(ports);

  it("POST → 202 Pending, then GET → Complete with search", async () => {
    const postRes = await request(app())
      .post("/cribsearch/v1/journey")
      .send(validRequest)
      .expect(202);

    const postBody = postRes.body as JourneySearchResponse;
    expect(postBody.status).toBe("Pending");
    expect(postBody.id).toBeDefined();

    const getRes = await request(app())
      .get(`/cribsearch/v1/journey/${postBody.id}`)
      .expect(200);

    const getBody = getRes.body as JourneySearchResponse;
    expect(getBody.status).toBe("Complete");
    expect(getBody.search).toBeDefined();
    expect(getBody.search!.address).toBe(validRequest.address);
    expect(getBody.search!.amenityGroups.length).toBeGreaterThan(0);
    expect(getBody.search!.pois.length).toBe(1);
  });

  it("POST with forced POI failure → GET returns PartialFailure", async () => {
    maps.addFailingAddress("456 Office St");

    const postRes = await request(app())
      .post("/cribsearch/v1/journey")
      .send(validRequest)
      .expect(202);

    const postBody = postRes.body as JourneySearchResponse;

    const getRes = await request(app())
      .get(`/cribsearch/v1/journey/${postBody.id}`)
      .expect(200);

    const getBody = getRes.body as JourneySearchResponse;
    expect(getBody.status).toBe("PartialFailure");
    expect(getBody.search).toBeDefined();
    expect(getBody.error).toBeDefined();
  });

  it("POST with forced permanent amenity failure → GET returns Failed", async () => {
    maps.forceAmenityFailure("permanent");

    const postRes = await request(app())
      .post("/cribsearch/v1/journey")
      .send(validRequest)
      .expect(202);

    const postBody = postRes.body as JourneySearchResponse;

    const getRes = await request(app())
      .get(`/cribsearch/v1/journey/${postBody.id}`)
      .expect(200);

    const getBody = getRes.body as JourneySearchResponse;
    expect(getBody.status).toBe("Failed");
    expect(getBody.error).toBeDefined();
  });

  it("POST with invalid body → 400 with error", async () => {
    const res = await request(app())
      .post("/cribsearch/v1/journey")
      .send({ address: "", modes: [], amenityCategories: [], pois: [] })
      .expect(400);

    expect(res.body.error).toBeDefined();
  });

  it("GET unknown id → 404", async () => {
    await request(app())
      .get("/cribsearch/v1/journey/nonexistent")
      .expect(404);
  });
});
