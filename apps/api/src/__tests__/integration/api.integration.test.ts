import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../../app";
import { processSearchRequest } from "../../features/searches/service/processSearchRequest";
import { getSearchRequest } from "../../features/searches/service/get-search-request";
import { maps } from "../../shared/maps";
import { truncateAll } from "./db-helpers";
import type {
  SearchRequest,
  SearchResponse,
  SearchSummary,
} from "@cribsearch/shared-types";

const app = createApp();

const DEV_USER_ID = "00000000-0000-0000-0000-000000000001";

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

  it("POST without x-user-id → 400 user is required", async () => {
    const res = await request(app)
      .post("/cribsearch/v1/searches")
      .send(validBody)
      .expect(400);
    expect((res.body as { error: string }).error).toMatch(/user is required/i);
  });

  it("POST valid body → 202 with id and Pending status; Pending row exists in DB", async () => {
    const res = await request(app)
      .post("/cribsearch/v1/searches")
      .set("x-user-id", DEV_USER_ID)
      .send(validBody)
      .expect(202);

    const body = res.body as SearchResponse;
    expect(typeof body.id).toBe("string");
    expect(body.status).toBe("Pending");

    // Verify the row is in DB and Pending (no search yet)
    const view = await getSearchRequest(body.id, DEV_USER_ID);
    expect(view).not.toBeNull();
    expect(view!.status).toBe("Pending");
    expect(view!.search).toBeUndefined();
  });

  it("POST invalid body → 400 with error", async () => {
    const res = await request(app)
      .post("/cribsearch/v1/searches")
      .set("x-user-id", DEV_USER_ID)
      .send({ address: "", modes: [], amenityCategories: [], pois: [] })
      .expect(400);

    const body = res.body as { error: string };
    expect(typeof body.error).toBe("string");
    expect(body.error.length).toBeGreaterThan(0);
  });

  it("GET unknown uuid → 404", async () => {
    await request(app)
      .get("/cribsearch/v1/searches/00000000-0000-0000-0000-000000000000")
      .set("x-user-id", DEV_USER_ID)
      .expect(404);
  });

  it("GET non-uuid id → 404", async () => {
    await request(app)
      .get("/cribsearch/v1/searches/not-a-valid-id")
      .set("x-user-id", DEV_USER_ID)
      .expect(404);
  });

  it("full flow: POST → processSearchRequest → GET → 200 Complete with search", async () => {
    // POST to create
    const postRes = await request(app)
      .post("/cribsearch/v1/searches")
      .set("x-user-id", DEV_USER_ID)
      .send(validBody)
      .expect(202);

    const { id } = postRes.body as SearchResponse;

    // Process locally (no queue in test)
    await processSearchRequest({ ...validBody, searchRequestId: id });

    // GET to verify
    const getRes = await request(app)
      .get(`/cribsearch/v1/searches/${id}`)
      .set("x-user-id", DEV_USER_ID)
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
      .set("x-user-id", DEV_USER_ID)
      .send(validBody)
      .expect(202);

    const { id } = postRes.body as SearchResponse;

    await processSearchRequest({ ...validBody, searchRequestId: id });

    const getRes = await request(app)
      .get(`/cribsearch/v1/searches/${id}`)
      .set("x-user-id", DEV_USER_ID)
      .expect(200);

    const body = getRes.body as SearchResponse;
    expect(body.status).toBe("PartialFailure");
    expect(body.search).toBeDefined();
    expect(body.error).toBeDefined();
    expect(body.error!.length).toBeGreaterThan(0);
  });

  // ── GET /searches (History list) ────────────────────────────────────────

  it("GET /searches without x-user-id → 400 user is required", async () => {
    const res = await request(app)
      .get("/cribsearch/v1/searches")
      .expect(400);
    expect((res.body as { error: string }).error).toMatch(/user is required/i);
  });

  it("GET /searches with dev user → 200 array of summaries, newest-first, no amenityGroups", async () => {
    // Create two searches in sequence
    const firstRes = await request(app)
      .post("/cribsearch/v1/searches")
      .set("x-user-id", DEV_USER_ID)
      .send({ ...validBody, address: "1 First St, Sydney" })
      .expect(202);
    const firstId = (firstRes.body as SearchResponse).id;

    const secondRes = await request(app)
      .post("/cribsearch/v1/searches")
      .set("x-user-id", DEV_USER_ID)
      .send({ ...validBody, address: "2 Second St, Sydney" })
      .expect(202);
    const secondId = (secondRes.body as SearchResponse).id;

    const listRes = await request(app)
      .get("/cribsearch/v1/searches")
      .set("x-user-id", DEV_USER_ID)
      .expect(200);

    const summaries = listRes.body as SearchSummary[];
    expect(Array.isArray(summaries)).toBe(true);
    expect(summaries).toHaveLength(2);

    // Newest-first: second search created last, so it should appear first
    expect(summaries[0]!.id).toBe(secondId);
    expect(summaries[1]!.id).toBe(firstId);

    // Each item has the required fields
    for (const summary of summaries) {
      expect(typeof summary.id).toBe("string");
      expect(typeof summary.status).toBe("string");
      expect(typeof summary.address).toBe("string");
      expect(typeof summary.createdAt).toBe("string");
      // No full search fields present
      expect((summary as unknown as Record<string, unknown>)["amenityGroups"]).toBeUndefined();
    }
  });

  it("GET /searches with a different user → 200 empty array (isolation)", async () => {
    // Create a search as the dev user
    await request(app)
      .post("/cribsearch/v1/searches")
      .set("x-user-id", DEV_USER_ID)
      .send(validBody)
      .expect(202);

    // A different (non-seeded) user sees nothing; a GET doesn't need a FK entry
    const otherUserId = "00000000-0000-0000-0000-000000000002";
    const res = await request(app)
      .get("/cribsearch/v1/searches")
      .set("x-user-id", otherUserId)
      .expect(200);

    expect(res.body as SearchSummary[]).toHaveLength(0);
  });

  // ── GET /searches/:id (user-scoped) ─────────────────────────────────────

  it("GET /searches/:id without x-user-id → 400", async () => {
    const res = await request(app)
      .get("/cribsearch/v1/searches/00000000-0000-0000-0000-000000000000")
      .expect(400);
    expect((res.body as { error: string }).error).toMatch(/user is required/i);
  });

  it("GET /searches/:id for a search owned by dev user → 200", async () => {
    const postRes = await request(app)
      .post("/cribsearch/v1/searches")
      .set("x-user-id", DEV_USER_ID)
      .send(validBody)
      .expect(202);
    const { id } = postRes.body as SearchResponse;

    const getRes = await request(app)
      .get(`/cribsearch/v1/searches/${id}`)
      .set("x-user-id", DEV_USER_ID)
      .expect(200);

    const body = getRes.body as SearchResponse;
    expect(body.id).toBe(id);
    expect(body.status).toBe("Pending");
  });

  it("GET /searches/:id with different user for dev-user-owned search → 404 (ownership not leaked)", async () => {
    const postRes = await request(app)
      .post("/cribsearch/v1/searches")
      .set("x-user-id", DEV_USER_ID)
      .send(validBody)
      .expect(202);
    const { id } = postRes.body as SearchResponse;

    const otherUserId = "00000000-0000-0000-0000-000000000002";
    const res = await request(app)
      .get(`/cribsearch/v1/searches/${id}`)
      .set("x-user-id", otherUserId)
      .expect(404);

    expect((res.body as { error: string }).error).toBe("Not Found");
  });

  it("GET /searches/:id for unknown uuid → 404", async () => {
    const res = await request(app)
      .get("/cribsearch/v1/searches/00000000-0000-0000-0000-000000000099")
      .set("x-user-id", DEV_USER_ID)
      .expect(404);

    expect((res.body as { error: string }).error).toBe("Not Found");
  });
});
