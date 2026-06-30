import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import request from "supertest";
import { createApp } from "../../app";
import { maps } from "../../shared/maps";
import { truncateAll } from "./db-helpers";
import { getPool } from "../../shared/db/postgres";
import type { Poi } from "@cribsearch/shared-types";

const app = createApp();

const DEV_USER_ID = "00000000-0000-0000-0000-000000000001";
const OTHER_USER_ID = "00000000-0000-0000-0000-000000000002";

const validBody = { label: "Work", address: "456 George St, Sydney" };

/** Seed the second user (ON CONFLICT DO NOTHING so repeated runs are safe). */
const ensureSecondUser = async (): Promise<void> => {
  const pool = await getPool();
  await pool.query(
    `INSERT INTO users (id) VALUES ($1) ON CONFLICT (id) DO NOTHING`,
    [OTHER_USER_ID],
  );
};

beforeAll(async () => {
  await ensureSecondUser();
});

beforeEach(async () => {
  maps.reset();
  await truncateAll();
});

describe("POI API integration", () => {
  // ── missing user header ──────────────────────────────────────────────────

  it("GET /pois without x-user-id → 400 user is required", async () => {
    const res = await request(app).get("/cribsearch/v1/pois").expect(400);
    expect((res.body as { error: string }).error).toMatch(/user is required/i);
  });

  it("POST /pois without x-user-id → 400 user is required", async () => {
    const res = await request(app)
      .post("/cribsearch/v1/pois")
      .send(validBody)
      .expect(400);
    expect((res.body as { error: string }).error).toMatch(/user is required/i);
  });

  // ── validation errors ────────────────────────────────────────────────────

  it("POST /pois empty label → 400 validation error", async () => {
    const res = await request(app)
      .post("/cribsearch/v1/pois")
      .set("x-user-id", DEV_USER_ID)
      .send({ label: "", address: "123 Main St" })
      .expect(400);
    expect((res.body as { error: string }).error).toMatch(/label/i);
  });

  it("POST /pois empty address → 400 validation error, no row persisted", async () => {
    const res = await request(app)
      .post("/cribsearch/v1/pois")
      .set("x-user-id", DEV_USER_ID)
      .send({ label: "Work", address: "" })
      .expect(400);
    expect((res.body as { error: string }).error).toMatch(/address/i);

    // Verify nothing was persisted
    const listRes = await request(app)
      .get("/cribsearch/v1/pois")
      .set("x-user-id", DEV_USER_ID)
      .expect(200);
    expect(listRes.body as Poi[]).toHaveLength(0);
  });

  // ── geocode failures ─────────────────────────────────────────────────────

  it("POST /pois with permanent geocode failure → 400, no row persisted", async () => {
    maps.forceGeocodeFailure("permanent");

    const res = await request(app)
      .post("/cribsearch/v1/pois")
      .set("x-user-id", DEV_USER_ID)
      .send(validBody)
      .expect(400);
    expect(typeof (res.body as { error: string }).error).toBe("string");

    const listRes = await request(app)
      .get("/cribsearch/v1/pois")
      .set("x-user-id", DEV_USER_ID)
      .expect(200);
    expect(listRes.body as Poi[]).toHaveLength(0);
  });

  it("POST /pois with transient geocode failure → 503", async () => {
    maps.forceGeocodeFailure("transient");

    const res = await request(app)
      .post("/cribsearch/v1/pois")
      .set("x-user-id", DEV_USER_ID)
      .send(validBody)
      .expect(503);
    expect(typeof (res.body as { error: string }).error).toBe("string");
  });

  // ── happy-path CRUD ──────────────────────────────────────────────────────

  it("POST /pois → 201 with Poi (id, label, address, geocode)", async () => {
    const res = await request(app)
      .post("/cribsearch/v1/pois")
      .set("x-user-id", DEV_USER_ID)
      .send(validBody)
      .expect(201);

    const poi = res.body as Poi;
    expect(typeof poi.id).toBe("string");
    expect(poi.id.length).toBeGreaterThan(0);
    expect(poi.label).toBe(validBody.label);
    expect(poi.address).toBe(validBody.address);
    expect(poi.geocode).toBeDefined();
    expect(typeof poi.geocode!.lat).toBe("number");
    expect(typeof poi.geocode!.lng).toBe("number");
  });

  it("GET /pois → 200 Poi[] (create then list)", async () => {
    // Create two POIs
    await request(app)
      .post("/cribsearch/v1/pois")
      .set("x-user-id", DEV_USER_ID)
      .send({ label: "Work", address: "456 George St" })
      .expect(201);
    await request(app)
      .post("/cribsearch/v1/pois")
      .set("x-user-id", DEV_USER_ID)
      .send({ label: "Gym", address: "789 Park Ave" })
      .expect(201);

    const res = await request(app)
      .get("/cribsearch/v1/pois")
      .set("x-user-id", DEV_USER_ID)
      .expect(200);

    const pois = res.body as Poi[];
    expect(pois).toHaveLength(2);
    // Ordered DESC by created_at_utc — most recent first
    expect(pois[0]!.label).toBe("Gym");
    expect(pois[1]!.label).toBe("Work");
  });

  it("PUT /:poiId label-only change → 200, no re-geocode (geocode preserved)", async () => {
    const createRes = await request(app)
      .post("/cribsearch/v1/pois")
      .set("x-user-id", DEV_USER_ID)
      .send(validBody)
      .expect(201);
    const { id, geocode: originalGeocode } = createRes.body as Poi;

    // Change only the label — address stays the same
    const updateRes = await request(app)
      .put(`/cribsearch/v1/pois/${id}`)
      .set("x-user-id", DEV_USER_ID)
      .send({ label: "New Label", address: validBody.address })
      .expect(200);

    const updated = updateRes.body as Poi;
    expect(updated.label).toBe("New Label");
    expect(updated.address).toBe(validBody.address);
    // Geocode should not have changed (stub always returns same value, but confirm it's present)
    expect(updated.geocode).toEqual(originalGeocode);
  });

  it("PUT /:poiId address change → 200, geocode updated", async () => {
    const createRes = await request(app)
      .post("/cribsearch/v1/pois")
      .set("x-user-id", DEV_USER_ID)
      .send(validBody)
      .expect(201);
    const { id } = createRes.body as Poi;

    const updateRes = await request(app)
      .put(`/cribsearch/v1/pois/${id}`)
      .set("x-user-id", DEV_USER_ID)
      .send({ label: "Work", address: "1 New Address" })
      .expect(200);

    const updated = updateRes.body as Poi;
    expect(updated.address).toBe("1 New Address");
    expect(updated.geocode).toBeDefined();
  });

  it("PUT /:poiId address change with transient geocode failure → 503", async () => {
    const createRes = await request(app)
      .post("/cribsearch/v1/pois")
      .set("x-user-id", DEV_USER_ID)
      .send(validBody)
      .expect(201);
    const { id } = createRes.body as Poi;

    maps.forceGeocodeFailure("transient");

    await request(app)
      .put(`/cribsearch/v1/pois/${id}`)
      .set("x-user-id", DEV_USER_ID)
      .send({ label: "Work", address: "1 Different Address" })
      .expect(503);
  });

  it("DELETE /:poiId → 204; subsequent GET /pois shows it removed", async () => {
    const createRes = await request(app)
      .post("/cribsearch/v1/pois")
      .set("x-user-id", DEV_USER_ID)
      .send(validBody)
      .expect(201);
    const { id } = createRes.body as Poi;

    await request(app)
      .delete(`/cribsearch/v1/pois/${id}`)
      .set("x-user-id", DEV_USER_ID)
      .expect(204);

    const listRes = await request(app)
      .get("/cribsearch/v1/pois")
      .set("x-user-id", DEV_USER_ID)
      .expect(200);
    expect(listRes.body as Poi[]).toHaveLength(0);
  });

  // ── ownership isolation ──────────────────────────────────────────────────

  it("user B cannot see user A's POIs", async () => {
    // Create POI as user A
    await request(app)
      .post("/cribsearch/v1/pois")
      .set("x-user-id", DEV_USER_ID)
      .send(validBody)
      .expect(201);

    // User B should see empty list
    const res = await request(app)
      .get("/cribsearch/v1/pois")
      .set("x-user-id", OTHER_USER_ID)
      .expect(200);
    expect(res.body as Poi[]).toHaveLength(0);
  });

  it("user B cannot update user A's POI → 404", async () => {
    const createRes = await request(app)
      .post("/cribsearch/v1/pois")
      .set("x-user-id", DEV_USER_ID)
      .send(validBody)
      .expect(201);
    const { id } = createRes.body as Poi;

    const res = await request(app)
      .put(`/cribsearch/v1/pois/${id}`)
      .set("x-user-id", OTHER_USER_ID)
      .send({ label: "Hijacked", address: "evil address" })
      .expect(404);
    expect((res.body as { error: string }).error).toMatch(/not found/i);
  });

  it("user B cannot delete user A's POI → 404", async () => {
    const createRes = await request(app)
      .post("/cribsearch/v1/pois")
      .set("x-user-id", DEV_USER_ID)
      .send(validBody)
      .expect(201);
    const { id } = createRes.body as Poi;

    const res = await request(app)
      .delete(`/cribsearch/v1/pois/${id}`)
      .set("x-user-id", OTHER_USER_ID)
      .expect(404);
    expect((res.body as { error: string }).error).toMatch(/not found/i);

    // Original POI should still exist
    const listRes = await request(app)
      .get("/cribsearch/v1/pois")
      .set("x-user-id", DEV_USER_ID)
      .expect(200);
    expect(listRes.body as Poi[]).toHaveLength(1);
  });

  // ── not found / invalid id ───────────────────────────────────────────────

  it("PUT with unknown uuid → 404", async () => {
    await request(app)
      .put("/cribsearch/v1/pois/00000000-0000-0000-0000-000000000000")
      .set("x-user-id", DEV_USER_ID)
      .send(validBody)
      .expect(404);
  });

  it("DELETE with unknown uuid → 404", async () => {
    await request(app)
      .delete("/cribsearch/v1/pois/00000000-0000-0000-0000-000000000000")
      .set("x-user-id", DEV_USER_ID)
      .expect(404);
  });

  it("PUT with non-uuid poiId → 404", async () => {
    await request(app)
      .put("/cribsearch/v1/pois/not-a-uuid")
      .set("x-user-id", DEV_USER_ID)
      .send(validBody)
      .expect(404);
  });

  it("DELETE with non-uuid poiId → 404", async () => {
    await request(app)
      .delete("/cribsearch/v1/pois/not-a-uuid")
      .set("x-user-id", DEV_USER_ID)
      .expect(404);
  });
});
