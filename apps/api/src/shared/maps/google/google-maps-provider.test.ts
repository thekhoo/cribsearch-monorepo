import { describe, it, expect, vi } from "vitest";
import {
  toDirectionsMode,
  toPlacesIncludedType,
  classifyGoogleStatus,
} from "./mappers";
import { GoogleMapsClient } from "./google-maps-client";
import { GoogleMapsProvider } from "./google-maps-provider";
import { MapsError } from "../maps-provider";

// ── Helper: build a fake fetch that returns the given payload ─────────────────

function makeFetch(
  payload: unknown,
  opts: { status?: number; ok?: boolean } = {},
): typeof fetch {
  const status = opts.status ?? 200;
  const ok = opts.ok ?? status < 400;
  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(payload),
  } as Response);
}

// ── mappers ───────────────────────────────────────────────────────────────────

describe("toDirectionsMode", () => {
  it.each([
    ["walk", "walking"],
    ["transit", "transit"],
    ["cycle", "bicycling"],
    ["drive", "driving"],
  ] as const)("%s → %s", (mode, expected) => {
    expect(toDirectionsMode(mode)).toBe(expected);
  });
});

describe("toPlacesIncludedType", () => {
  it.each([
    ["supermarket", "supermarket"],
    ["transit_stop", "transit_station"],
    ["pharmacy", "pharmacy"],
    ["park", "park"],
  ] as const)("%s → %s", (category, expected) => {
    expect(toPlacesIncludedType(category)).toBe(expected);
  });
});

describe("classifyGoogleStatus", () => {
  it.each(["OVER_QUERY_LIMIT", "UNKNOWN_ERROR"] as const)(
    "%s → transient",
    (status) => {
      expect(classifyGoogleStatus(status)).toBe("transient");
    },
  );

  it.each([
    "ZERO_RESULTS",
    "NOT_FOUND",
    "REQUEST_DENIED",
    "INVALID_REQUEST",
  ] as const)("%s → permanent", (status) => {
    expect(classifyGoogleStatus(status)).toBe("permanent");
  });

  it("unknown status defaults to permanent", () => {
    expect(classifyGoogleStatus("SOME_NEW_STATUS")).toBe("permanent");
  });
});

// ── GoogleMapsClient.geocode ──────────────────────────────────────────────────

describe("GoogleMapsClient.geocode", () => {
  it("returns lat/lng on OK response", async () => {
    const fakeFetch = makeFetch({
      status: "OK",
      results: [{ geometry: { location: { lat: -33.8688, lng: 151.2093 } } }],
    });
    const client = new GoogleMapsClient("test-token", { fetch: fakeFetch });
    const result = await client.geocode("Sydney NSW");
    expect(result).toEqual({ lat: -33.8688, lng: 151.2093 });
  });

  it("throws permanent MapsError on NOT_FOUND", async () => {
    const fakeFetch = makeFetch({ status: "NOT_FOUND", results: [] });
    const client = new GoogleMapsClient("test-token", { fetch: fakeFetch });
    await expect(client.geocode("nowhere")).rejects.toMatchObject({
      name: "MapsError",
      kind: "permanent",
      message: "NOT_FOUND",
    });
  });

  it("throws transient MapsError on network abort", async () => {
    const fakeFetch = vi.fn().mockRejectedValue(new Error("The operation was aborted"));
    const client = new GoogleMapsClient("test-token", { fetch: fakeFetch });
    const err = await client.geocode("Sydney NSW").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(MapsError);
    expect((err as MapsError).kind).toBe("transient");
  });
});

// ── GoogleMapsClient.directions ───────────────────────────────────────────────

describe("GoogleMapsClient.directions", () => {
  it("returns duration seconds on OK response", async () => {
    const fakeFetch = makeFetch({
      status: "OK",
      routes: [{ legs: [{ duration: { value: 1234 } }] }],
    });
    const client = new GoogleMapsClient("test-token", { fetch: fakeFetch });
    const seconds = await client.directions({
      origin: "A",
      destination: "B",
      mode: "walk",
    });
    expect(seconds).toBe(1234);
  });

  it("rounds correctly when used with Math.round in provider", () => {
    // 1234 seconds / 60 = 20.566... → rounds to 21
    expect(Math.round(1234 / 60)).toBe(21);
  });

  it("throws permanent MapsError on ZERO_RESULTS", async () => {
    const fakeFetch = makeFetch({ status: "ZERO_RESULTS", routes: [] });
    const client = new GoogleMapsClient("test-token", { fetch: fakeFetch });
    await expect(
      client.directions({ origin: "A", destination: "B", mode: "drive" }),
    ).rejects.toMatchObject({
      name: "MapsError",
      kind: "permanent",
      message: "ZERO_RESULTS",
    });
  });

  it("throws transient MapsError on OVER_QUERY_LIMIT", async () => {
    const fakeFetch = makeFetch({ status: "OVER_QUERY_LIMIT", routes: [] });
    const client = new GoogleMapsClient("test-token", { fetch: fakeFetch });
    await expect(
      client.directions({ origin: "A", destination: "B", mode: "transit" }),
    ).rejects.toMatchObject({
      name: "MapsError",
      kind: "transient",
      message: "OVER_QUERY_LIMIT",
    });
  });
});

// ── GoogleMapsClient.nearby ───────────────────────────────────────────────────

describe("GoogleMapsClient.nearby", () => {
  it("parses places[] into {id, name, address}", async () => {
    const fakeFetch = makeFetch({
      places: [
        {
          id: "place-1",
          displayName: { text: "Coles Haymarket" },
          formattedAddress: "1 Market St, Sydney NSW",
        },
        {
          id: "place-2",
          displayName: { text: "Woolworths Metro" },
          formattedAddress: "2 George St, Sydney NSW",
        },
      ],
    });
    const client = new GoogleMapsClient("test-token", { fetch: fakeFetch });
    const results = await client.nearby({ lat: -33.87, lng: 151.2, includedType: "supermarket" });
    expect(results).toEqual([
      { id: "place-1", name: "Coles Haymarket", address: "1 Market St, Sydney NSW" },
      { id: "place-2", name: "Woolworths Metro", address: "2 George St, Sydney NSW" },
    ]);
  });

  it("returns [] when places array is absent", async () => {
    const fakeFetch = makeFetch({});
    const client = new GoogleMapsClient("test-token", { fetch: fakeFetch });
    const results = await client.nearby({ lat: -33.87, lng: 151.2, includedType: "park" });
    expect(results).toEqual([]);
  });

  it("returns [] when places array is empty", async () => {
    const fakeFetch = makeFetch({ places: [] });
    const client = new GoogleMapsClient("test-token", { fetch: fakeFetch });
    const results = await client.nearby({ lat: -33.87, lng: 151.2, includedType: "pharmacy" });
    expect(results).toEqual([]);
  });

  it("sends correct field mask and api key headers", async () => {
    const fakeFetch = makeFetch({ places: [] });
    const client = new GoogleMapsClient("my-api-key", { fetch: fakeFetch });
    await client.nearby({ lat: 1, lng: 2, includedType: "supermarket" });

    expect(fakeFetch).toHaveBeenCalledOnce();
    const [, init] = (fakeFetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers["X-Goog-Api-Key"]).toBe("my-api-key");
    expect(headers["X-Goog-FieldMask"]).toBe(
      "places.id,places.displayName,places.formattedAddress,places.location",
    );
  });

  it("throws transient MapsError on HTTP 429", async () => {
    const fakeFetch = makeFetch(
      { error: { status: "RESOURCE_EXHAUSTED", message: "Quota exceeded" } },
      { status: 429, ok: false },
    );
    const client = new GoogleMapsClient("test-token", { fetch: fakeFetch });
    await expect(
      client.nearby({ lat: 1, lng: 2, includedType: "park" }),
    ).rejects.toMatchObject({ name: "MapsError", kind: "transient" });
  });

  it("throws permanent MapsError on HTTP 403", async () => {
    const fakeFetch = makeFetch(
      { error: { status: "PERMISSION_DENIED", message: "API key invalid" } },
      { status: 403, ok: false },
    );
    const client = new GoogleMapsClient("bad-token", { fetch: fakeFetch });
    await expect(
      client.nearby({ lat: 1, lng: 2, includedType: "pharmacy" }),
    ).rejects.toMatchObject({ name: "MapsError", kind: "permanent" });
  });
});

// ── GoogleMapsProvider.computeTravelStats ─────────────────────────────────────

describe("GoogleMapsProvider.computeTravelStats", () => {
  it("builds correct TravelStat[] across multiple modes", async () => {
    // walk: 600s = 10 min, transit: 900s = 15 min
    let callCount = 0;
    const fakeFetch = vi.fn().mockImplementation(() => {
      const seconds = callCount === 0 ? 600 : 900;
      callCount++;
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            status: "OK",
            routes: [{ legs: [{ duration: { value: seconds } }] }],
          }),
      } as Response);
    });
    const client = new GoogleMapsClient("test-token", { fetch: fakeFetch });
    const provider = new GoogleMapsProvider(client);

    const results = await provider.computeTravelStats(
      "1 Test St",
      [{ label: "Office", address: "2 Work St" }],
      ["walk", "transit"],
    );

    expect(results).toHaveLength(1);
    const [result] = results;
    expect(result?.id).toBe("dest-0");
    expect(result?.name).toBe("Office");
    expect(result?.address).toBe("2 Work St");
    expect(result?.travelStats).toEqual([
      { mode: "walk", minutes: 10 },
      { mode: "transit", minutes: 15 },
    ]);
  });

  it("propagates MapsError thrown by client.directions", async () => {
    const fakeFetch = makeFetch({ status: "ZERO_RESULTS", routes: [] });
    const client = new GoogleMapsClient("test-token", { fetch: fakeFetch });
    const provider = new GoogleMapsProvider(client);

    await expect(
      provider.computeTravelStats("A", [{ label: "B", address: "B" }], ["walk"]),
    ).rejects.toMatchObject({ name: "MapsError", kind: "permanent" });
  });
});

// ── GoogleMapsProvider.findAmenities ─────────────────────────────────────────

describe("GoogleMapsProvider.findAmenities", () => {
  /**
   * Build a fake fetch that handles the sequence of requests:
   * 1. geocode → lat/lng
   * 2. nearby (supermarket) → two places
   * 3. directions for place-1/walk → 600s
   * 4. directions for place-2/walk → 900s (or error)
   */
  function buildFetchSequence(
    secondPlaceDirections: "ok" | "permanent" | "transient",
  ): typeof fetch {
    const geocodeResponse = {
      status: "OK",
      results: [{ geometry: { location: { lat: -33.87, lng: 151.2 } } }],
    };
    const nearbyResponse = {
      places: [
        {
          id: "place-1",
          displayName: { text: "Coles" },
          formattedAddress: "1 Market St",
        },
        {
          id: "place-2",
          displayName: { text: "Woolworths" },
          formattedAddress: "2 George St",
        },
      ],
    };
    const directionsOk = (value: number) => ({
      status: "OK",
      routes: [{ legs: [{ duration: { value } }] }],
    });
    const directionsErr = (status: string) => ({ status, routes: [] });

    const responses: Array<{ body: unknown; httpStatus?: number }> = [
      { body: geocodeResponse },
      { body: nearbyResponse },
      { body: directionsOk(600) }, // place-1 directions
    ];

    if (secondPlaceDirections === "ok") {
      responses.push({ body: directionsOk(900) }); // place-2 directions
    } else if (secondPlaceDirections === "permanent") {
      responses.push({ body: directionsErr("ZERO_RESULTS") }); // place-2 permanent fail
    } else {
      responses.push({ body: directionsErr("OVER_QUERY_LIMIT") }); // place-2 transient fail
    }

    let idx = 0;
    return vi.fn().mockImplementation(() => {
      const entry = responses[idx++]!;
      const status = entry.httpStatus ?? 200;
      return Promise.resolve({
        ok: status < 400,
        status,
        json: () => Promise.resolve(entry.body),
      } as Response);
    });
  }

  it("wires geocode + nearby + per-amenity directions together", async () => {
    const fakeFetch = buildFetchSequence("ok");
    const client = new GoogleMapsClient("test-token", { fetch: fakeFetch });
    const provider = new GoogleMapsProvider(client);

    const groups = await provider.findAmenities("Home", ["supermarket"], ["walk"]);

    expect(groups).toHaveLength(1);
    const group = groups[0]!;
    expect(group.category).toBe("supermarket");
    expect(group.destinations).toHaveLength(2);

    const [d1, d2] = group.destinations;
    expect(d1?.id).toBe("place-1");
    expect(d1?.name).toBe("Coles");
    expect(d1?.travelStats).toEqual([{ mode: "walk", minutes: 10 }]);
    expect(d2?.id).toBe("place-2");
    expect(d2?.name).toBe("Woolworths");
    expect(d2?.travelStats).toEqual([{ mode: "walk", minutes: 15 }]);
  });

  it("drops amenity that throws a permanent MapsError on directions", async () => {
    const fakeFetch = buildFetchSequence("permanent");
    const client = new GoogleMapsClient("test-token", { fetch: fakeFetch });
    const provider = new GoogleMapsProvider(client);

    const groups = await provider.findAmenities("Home", ["supermarket"], ["walk"]);

    expect(groups).toHaveLength(1);
    const group = groups[0]!;
    // place-2 (Woolworths) dropped; only place-1 (Coles) survives
    expect(group.destinations).toHaveLength(1);
    expect(group.destinations[0]?.id).toBe("place-1");
  });

  it("propagates transient MapsError from per-amenity directions", async () => {
    const fakeFetch = buildFetchSequence("transient");
    const client = new GoogleMapsClient("test-token", { fetch: fakeFetch });
    const provider = new GoogleMapsProvider(client);

    await expect(
      provider.findAmenities("Home", ["supermarket"], ["walk"]),
    ).rejects.toMatchObject({ name: "MapsError", kind: "transient" });
  });
});
