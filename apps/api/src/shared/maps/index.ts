import { StubMapsProvider } from "./stub-maps-provider";
export { MapsError } from "./maps-provider";
export type { MapsProvider, DestinationTravelResult } from "./maps-provider";

/**
 * App-wide maps provider. Stubbed for now; swap the concrete class here when a
 * real provider is wired. Exported as the concrete type so tests can drive its
 * failure-injection helpers.
 */
export const maps = new StubMapsProvider();
