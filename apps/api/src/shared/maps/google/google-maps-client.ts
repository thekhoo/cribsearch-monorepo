import type { TransportMode } from "@cribsearch/shared-types";
import { MapsError } from "../maps-provider";
import { classifyGoogleStatus, toDirectionsMode } from "./mappers";
import type {
  DirectionsResult,
  GeoCoordinate,
  GMapsDirectionsResponse,
  GMapsErrorResponse,
  GMapsGeocodeResponse,
  GMapsPlacesNearbyRequest,
  GMapsPlacesNearbyResponse,
  NearbyPlace,
} from "./types";

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

  /**
   * Fetches `input` and parses the JSON response as `T`. Centralises the
   * transport-level error handling shared by every endpoint: network/timeout
   * failures and non-2xx responses become `MapsError`s (5xx/429 transient,
   * other 4xx permanent), extracting the Places API error status when present.
   */
  private async fetchJson<T>(input: string, init?: RequestInit): Promise<T> {
    let res: Response;
    try {
      res = await this.fetchFn(input, { ...init, signal: this.abortSignal() });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new MapsError(message, "transient");
    }

    if (!res.ok) {
      const kind =
        res.status >= 500 || res.status === 429 ? "transient" : "permanent";
      let message = `HTTP ${String(res.status)}`;
      try {
        const errBody = (await res.json()) as GMapsErrorResponse;
        if (errBody.error?.status) {
          message = errBody.error.status;
        }
      } catch {
        // No/!JSON error body — keep the HTTP status message.
      }
      throw new MapsError(message, kind);
    }

    return (await res.json()) as T;
  }

  /**
   * The legacy web-service APIs (Geocoding, Directions) return HTTP 200 with a
   * top-level `status` field; anything other than "OK" is a logical error.
   */
  private assertLegacyOk(status: string): void {
    if (status !== "OK") {
      throw new MapsError(status, classifyGoogleStatus(status));
    }
  }

  async geocode(address: string): Promise<GeoCoordinate> {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${encodeURIComponent(this.token)}`;
    const body = await this.fetchJson<GMapsGeocodeResponse>(url);

    this.assertLegacyOk(body.status);

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
  }): Promise<DirectionsResult> {
    const url =
      `https://maps.googleapis.com/maps/api/directions/json` +
      `?origin=${encodeURIComponent(args.origin)}` +
      `&destination=${encodeURIComponent(args.destination)}` +
      `&mode=${toDirectionsMode(args.mode)}` +
      `&key=${encodeURIComponent(this.token)}`;

    const body = await this.fetchJson<GMapsDirectionsResponse>(url);

    this.assertLegacyOk(body.status);

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
  }): Promise<NearbyPlace[]> {
    const url = "https://places.googleapis.com/v1/places:searchNearby";

    const requestBody: GMapsPlacesNearbyRequest = {
      includedTypes: [args.includedType],
      maxResultCount: args.maxResults ?? 5,
      locationRestriction: {
        circle: {
          center: { latitude: args.lat, longitude: args.lng },
          radius: args.radiusMeters ?? 1500,
        },
      },
    };

    const body = await this.fetchJson<GMapsPlacesNearbyResponse>(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": this.token,
        // places types can be found here: https://developers.google.com/maps/documentation/places/web-service/nearby-search
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.location",
      },
      body: JSON.stringify(requestBody),
    });

    const places = body.places ?? [];

    return places.map((place) => ({
      id: place.id,
      name: place.displayName?.text ?? "",
      address: place.formattedAddress ?? "",
    }));
  }
}
