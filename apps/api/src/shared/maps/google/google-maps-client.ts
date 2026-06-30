import type { TransportMode } from "@cribsearch/shared-types";
import { MapsError } from "../maps-provider";
import { classifyGoogleStatus, toDirectionsMode } from "./mappers";

const DEFAULT_TIMEOUT_MS = 10_000;

interface GoogleMapsClientOpts {
  fetch?: typeof fetch;
  timeoutMs?: number;
}

type FetchFn = typeof fetch;

export class GoogleMapsClient {
  private readonly fetchFn: FetchFn;
  private readonly timeoutMs: number;

  constructor(
    private readonly token: string,
    opts?: GoogleMapsClientOpts,
  ) {
    this.fetchFn = opts?.fetch ?? globalThis.fetch;
    this.timeoutMs = opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  private abortSignal(): AbortSignal {
    return AbortSignal.timeout(this.timeoutMs);
  }

  private async fetchWithTimeout(
    input: string,
    init?: RequestInit,
  ): Promise<Response> {
    try {
      return await this.fetchFn(input, {
        ...init,
        signal: this.abortSignal(),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new MapsError(message, "transient");
    }
  }

  async geocode(address: string): Promise<{ lat: number; lng: number }> {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${encodeURIComponent(this.token)}`;
    const res = await this.fetchWithTimeout(url);

    if (!res.ok) {
      const kind = res.status >= 500 || res.status === 429 ? "transient" : "permanent";
      throw new MapsError(`HTTP ${String(res.status)}`, kind);
    }

    const body = (await res.json()) as { status: string; results: Array<{ geometry: { location: { lat: number; lng: number } } }> };

    if (body.status !== "OK") {
      throw new MapsError(body.status, classifyGoogleStatus(body.status));
    }

    const location = body.results[0]?.geometry.location;
    if (!location) {
      throw new MapsError("ZERO_RESULTS", "permanent");
    }

    return { lat: location.lat, lng: location.lng };
  }

  async directions(args: {
    origin: string;
    destination: string;
    mode: TransportMode;
  }): Promise<{ seconds: number; meters: number }> {
    const url =
      `https://maps.googleapis.com/maps/api/directions/json` +
      `?origin=${encodeURIComponent(args.origin)}` +
      `&destination=${encodeURIComponent(args.destination)}` +
      `&mode=${toDirectionsMode(args.mode)}` +
      `&key=${encodeURIComponent(this.token)}`;

    const res = await this.fetchWithTimeout(url);

    if (!res.ok) {
      const kind = res.status >= 500 || res.status === 429 ? "transient" : "permanent";
      throw new MapsError(`HTTP ${String(res.status)}`, kind);
    }

    const body = (await res.json()) as {
      status: string;
      routes: Array<{
        legs: Array<{
          duration: { value: number };
          distance: { value: number };
        }>;
      }>;
    };

    if (body.status !== "OK") {
      throw new MapsError(body.status, classifyGoogleStatus(body.status));
    }

    const leg = body.routes[0]?.legs[0];
    if (leg === undefined) {
      throw new MapsError("ZERO_RESULTS", "permanent");
    }

    return { seconds: leg.duration.value, meters: leg.distance.value };
  }

  async nearby(args: {
    lat: number;
    lng: number;
    includedType: string;
    maxResults?: number;
    radiusMeters?: number;
  }): Promise<Array<{ id: string; name: string; address: string }>> {
    const url = "https://places.googleapis.com/v1/places:searchNearby";

    const body = {
      includedTypes: [args.includedType],
      maxResultCount: args.maxResults ?? 5,
      locationRestriction: {
        circle: {
          center: { latitude: args.lat, longitude: args.lng },
          radius: args.radiusMeters ?? 1500,
        },
      },
    };

    const res = await this.fetchWithTimeout(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": this.token,
        // places types can be found here: https://developers.google.com/maps/documentation/places/web-service/nearby-search
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.location",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const kind = res.status >= 500 || res.status === 429 ? "transient" : "permanent";
      // Places New returns a JSON error body — try to extract the status message
      let errorMsg = `HTTP ${String(res.status)}`;
      try {
        const errBody = (await res.json()) as {
          error?: { status?: string; message?: string };
        };
        if (errBody.error?.status) {
          errorMsg = errBody.error.status;
        }
      } catch {
        // ignore JSON parse failure; use the HTTP status message
      }
      throw new MapsError(errorMsg, kind);
    }

    const responseBody = (await res.json()) as {
      places?: Array<{
        id: string;
        displayName?: { text?: string };
        formattedAddress?: string;
      }>;
    };

    const places = responseBody.places ?? [];

    return places.map((place) => ({
      id: place.id,
      name: place.displayName?.text ?? "",
      address: place.formattedAddress ?? "",
    }));
  }
}
