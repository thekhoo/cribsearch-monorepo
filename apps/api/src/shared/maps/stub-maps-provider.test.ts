import { describe, it, expect } from "vitest";
import { StubMapsProvider } from "./stub-maps-provider";

describe("StubMapsProvider.geocode", () => {
  it("returns a deterministic fake coordinate", async () => {
    const stub = new StubMapsProvider();
    const result = await stub.geocode("any address");
    expect(result).toEqual({ lat: -33.8688, lng: 151.2093 });
  });

  it("throws permanent MapsError when forceGeocodeFailure('permanent') is set", async () => {
    const stub = new StubMapsProvider();
    stub.forceGeocodeFailure("permanent");
    await expect(stub.geocode("any")).rejects.toMatchObject({
      name: "MapsError",
      kind: "permanent",
    });
  });

  it("throws transient MapsError when forceGeocodeFailure('transient') is set", async () => {
    const stub = new StubMapsProvider();
    stub.forceGeocodeFailure("transient");
    await expect(stub.geocode("any")).rejects.toMatchObject({
      name: "MapsError",
      kind: "transient",
    });
  });

  it("reset() clears geocodeFailure and restores happy-path behaviour", async () => {
    const stub = new StubMapsProvider();
    stub.forceGeocodeFailure("permanent");
    stub.reset();
    const result = await stub.geocode("any");
    expect(result).toEqual({ lat: -33.8688, lng: 151.2093 });
  });

  it("forceGeocodeFailure(null) clears the failure without calling reset()", async () => {
    const stub = new StubMapsProvider();
    stub.forceGeocodeFailure("transient");
    stub.forceGeocodeFailure(null);
    const result = await stub.geocode("any");
    expect(result).toEqual({ lat: -33.8688, lng: 151.2093 });
  });
});
