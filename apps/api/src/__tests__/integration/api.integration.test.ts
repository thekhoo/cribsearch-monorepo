import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../../app";
import { processSearchRequest } from "../../features/searches/service/process-search-request";
import { getSearchRequest } from "../../features/searches/service/get-search-request";
import { maps } from "../../shared/maps";
import { truncateAll } from "./db-helpers";
import type { SearchRequest, SearchResponse } from "@cribsearch/shared-types";

const app = createApp();

const validBody: SearchRequest = {
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
      .post("/cribsearch/v1/searches")
      .send(validBody)
      .expect(202);

    const body = res.body as SearchResponse;
    expect(typeof body.id).toBe("string");
    expect(body.status).toBe("Pending");

    // Verify the row is in DB and Pending (no search yet)
    const view = await getSearchRequest(body.id);
    expect(view).not.toBeNull();
    expect(view!.status).toBe("Pending");
    expect(view!.search).toBeUndefined();
  });

  it("POST invalid body → 400 with error", async () => {
    const res = await request(app)
      .post("/cribsearch/v1/searches")
      .send({ address: "", modes: [], amenityCategories: [], pois: [] })
      .expect(400);

    const body = res.body as { error: string };
    expect(typeof body.error).toBe("string");
    expect(body.error.length).toBeGreaterThan(0);
  });

  it("GET unknown uuid → 404", async () => {
    await request(app)
      .get("/cribsearch/v1/searches/00000000-0000-0000-0000-000000000000")
      .expect(404);
  });

  it("GET non-uuid id → 404", async () => {
    await request(app)
      .get("/cribsearch/v1/searches/not-a-valid-id")
      .expect(404);
  });

  it("full flow: POST → processSearchRequest → GET → 200 Complete with search", async () => {
    // POST to create
    const postRes = await request(app)
      .post("/cribsearch/v1/searches")
      .send(validBody)
      .expect(202);

    const { id } = postRes.body as SearchResponse;

    // Process locally (no queue in test)
    await processSearchRequest({ ...validBody, searchRequestId: id });

    // GET to verify
    const getRes = await request(app)
      .get(`/cribsearch/v1/searches/${id}`)
      .expect(200);

    const body = getRes.body as SearchResponse;
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
      .post("/cribsearch/v1/searches")
      .send(validBody)
      .expect(202);

    const { id } = postRes.body as SearchResponse;

    await processSearchRequest({ ...validBody, searchRequestId: id });

    const getRes = await request(app)
      .get(`/cribsearch/v1/searches/${id}`)
      .expect(200);

    const body = getRes.body as SearchResponse;
    expect(body.status).toBe("PartialFailure");
    expect(body.search).toBeDefined();
    expect(body.error).toBeDefined();
    expect(body.error!.length).toBeGreaterThan(0);
  });
});
