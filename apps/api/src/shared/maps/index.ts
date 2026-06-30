import { logger } from "@cribsearch/logger";
import type { MapsProvider } from "./maps-provider";
import { getParameter } from "../aws/ssm";
import { GoogleMapsClient } from "./google/google-maps-client";
import { GoogleMapsProvider } from "./google/google-maps-provider";
import { StubMapsProvider } from "./stub-maps-provider";

export { MapsError } from "./maps-provider";
export type { MapsProvider, DestinationTravelResult } from "./maps-provider";

const log = logger.child({ component: "maps" });

/**
 * App-wide maps stub singleton. Exported as the concrete type so tests can
 * drive its failure-injection helpers (reset, forceAmenityFailure, etc.).
 */
export const maps = new StubMapsProvider();

let cached: MapsProvider | null = null;

/**
 * Resolves the active MapsProvider. Resolution order:
 *  1. GMAPS_TOKEN env var → build and cache a GoogleMapsProvider.
 *  2. AWS Lambda env (AWS_LAMBDA_FUNCTION_NAME set) → fetch token from SSM,
 *     build and cache a GoogleMapsProvider.
 *  3. Otherwise → return the stub singleton (not cached, so tests keep control).
 */
export const getMaps = async (): Promise<MapsProvider> => {
  if (cached) return cached;

  const gmapsToken = process.env.GMAPS_TOKEN;
  if (gmapsToken) {
    cached = new GoogleMapsProvider(new GoogleMapsClient(gmapsToken));
    return cached;
  }

  if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
    log.info("fetching gmaps token from SSM");
    const token = await getParameter(
      "/production/cribsearch/service/gmaps/client/token",
      { decrypt: true },
    );
    cached = new GoogleMapsProvider(new GoogleMapsClient(token));
    return cached;
  }

  // Local / test environment: return the stub singleton without caching so
  // tests that inject failures via maps.forceAmenityFailure() etc. continue
  // to drive the same instance.
  return maps;
};
