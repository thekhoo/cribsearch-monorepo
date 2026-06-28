import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../../app";
import { processJourneyRequest } from "../../features/journey/service/process-journey-request";
import { getJourneyRequest } from "../../features/journey/service/get-journey-request";
import { maps } from "../../shared/maps";
import { truncateAll } from "./db-helpers";
import type { JourneySearchRequest, JourneySearchResponse } from "@cribsearch/shared-types";

const app = createApp();

const validBody: JourneySearchRequest = {
  address: "123 Main St, Sydney",
  modes: ["walk"],
  amenityCategories: ["supermarket"],
  pois: [{ label: "Work", address: "456 Office St" }],
};

describe("api integration", () => {
  beforeEach(async () => {
    maps.reset();
    await truncateAll();
  });

  it("POST valid body → 202 with id and Pending status; Pending row exists in DB", async () => {
    const res = await request(app)
      .post("/cribsearch/v1/journey")
      .send(validBody)
      .expect(202);

    const body = res.body as JourneySearchResponse;
    expect(typeof body.id).toBe("string");
    expect(body.status).toBe("Pending");

    // Verify the row is in DB and Pending (no search yet)
    const view = await getJourneyRequest(body.id);
    expect(view).not.toBeNull();
    expect(view!.status).toBe("Pending");
    expect(view!.search).toBeUndefined();
  });

  it("POST invalid body → 400 with error", async () => {
    const res = await request(app)
      .post("/cribsearch/v1/journey")
      .send({ address: "", modes: [], amenityCategories: [], pois: [] })
      .expect(400);

    const body = res.body as { error: string };
    expect(typeof body.error).toBe("string");
    expect(body.error.length).toBeGreaterThan(0);
  });

  it("GET unknown uuid → 404", async () => {
    await request(app)
      .get("/cribsearch/v1/journey/00000000-0000-0000-0000-000000000000")
      .expect(404);
  });

  it("GET non-uuid id → 404", async () => {
    await request(app)
      .get("/cribsearch/v1/journey/not-a-valid-id")
      .expect(404);
  });

  it("full flow: POST → processJourneyRequest → GET → 200 Complete with search", async () => {
    // POST to create
    const postRes = await request(app)
      .post("/cribsearch/v1/journey")
      .send(validBody)
      .expect(202);

    const { id } = postRes.body as JourneySearchResponse;

    // Process locally (no queue in test)
    await processJourneyRequest({ ...validBody, journeyRequestId: id });

    // GET to verify
    const getRes = await request(app)
      .get(`/cribsearch/v1/journey/${id}`)
      .expect(200);

    const body = getRes.body as JourneySearchResponse;
    expect(body.status).toBe("Complete");
    expect(body.search).toBeDefined();
    expect(body.search!.address).toBe(validBody.address);
    expect(body.search!.amenityGroups.length).toBeGreaterThan(0);
    expect(body.search!.pois).toHaveLength(1);
    expect(body.search!.pois[0]!.label).toBe("Work");
  });

  it("partial-failure flow: failing poi → POST → process → GET → PartialFailure, search defined, error defined", async () => {
    maps.addFailingAddress("456 Office St");

    const postRes = await request(app)
      .post("/cribsearch/v1/journey")
      .send(validBody)
      .expect(202);

    const { id } = postRes.body as JourneySearchResponse;

    await processJourneyRequest({ ...validBody, journeyRequestId: id });

    const getRes = await request(app)
      .get(`/cribsearch/v1/journey/${id}`)
      .expect(200);

    const body = getRes.body as JourneySearchResponse;
    expect(body.status).toBe("PartialFailure");
    expect(body.search).toBeDefined();
    expect(body.error).toBeDefined();
    expect(body.error!.length).toBeGreaterThan(0);
  });
});
