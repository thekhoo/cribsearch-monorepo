import { describe, it, expect, afterEach } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import { maps } from "../shared/maps";

const app = createApp();
const DEV_USER_ID = "00000000-0000-0000-0000-000000000001";

afterEach(() => {
  maps.reset();
});

describe("POI creation — geocode failure handling", () => {
  it("permanent geocode failure → 400 with error", async () => {
    maps.forceGeocodeFailure("permanent");

    const res = await request(app)
      .post("/cribsearch/v1/pois")
      .set("x-user-id", DEV_USER_ID)
      .send({ label: "Work", address: "unknown place" })
      .expect(400);

    const body = res.body as { error: string };
    expect(typeof body.error).toBe("string");
    expect(body.error.length).toBeGreaterThan(0);
  });

  it("transient geocode failure → 503 with error", async () => {
    maps.forceGeocodeFailure("transient");

    const res = await request(app)
      .post("/cribsearch/v1/pois")
      .set("x-user-id", DEV_USER_ID)
      .send({ label: "Work", address: "flaky address" })
      .expect(503);

    const body = res.body as { error: string };
    expect(typeof body.error).toBe("string");
    expect(body.error.length).toBeGreaterThan(0);
  });
});
