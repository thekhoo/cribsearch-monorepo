import type {
  AmenityCategory,
  JourneySearchRequest,
  JourneySearchResponse,
  Poi,
  RequestStatus,
  Search,
  TransportMode,
} from "@cribsearch/shared-types";
import { API_BASE_URL } from "./config";

export interface SearchInput {
  address: string;
  modes: TransportMode[];
  amenityCategories: AmenityCategory[];
  attachedPois: Poi[];
}

const TERMINAL_STATUSES: ReadonlySet<RequestStatus> = new Set([
  "Complete",
  "PartialFailure",
  "Failed",
]);

const POLL_INTERVAL_MS = 1500;
const MAX_ATTEMPTS = 30;

async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
}

/**
 * Submit an async journey search to the API and poll until a terminal status
 * is reached, then return the completed Search.
 *
 * Throws on non-202 POST responses, poll failures, "Failed" status, or timeout.
 */
export async function runSearch(input: SearchInput): Promise<Search> {
  const requestBody: JourneySearchRequest = {
    address: input.address,
    modes: input.modes,
    amenityCategories: input.amenityCategories,
    pois: input.attachedPois.map((p) => ({ label: p.label, address: p.address })),
  };

  const postResponse = await fetch(`${API_BASE_URL}/cribsearch/v1/journey`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });

  if (!postResponse.ok || postResponse.status !== 202) {
    const message = await extractErrorMessage(postResponse);
    throw new Error(`Failed to start search: ${message}`);
  }

  const { id } = (await postResponse.json()) as { id: string; status: RequestStatus };

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    await new Promise<void>((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

    const pollResponse = await fetch(`${API_BASE_URL}/cribsearch/v1/journey/${id}`);

    if (!pollResponse.ok) {
      const message = await extractErrorMessage(pollResponse);
      throw new Error(`Failed to poll search status: ${message}`);
    }

    const result = (await pollResponse.json()) as JourneySearchResponse;

    if (!TERMINAL_STATUSES.has(result.status)) {
      continue;
    }

    if (result.status === "Failed") {
      throw new Error(result.error ?? "Search failed");
    }

    if (result.search == null) {
      throw new Error("Search completed but result data is missing");
    }

    return result.search;
  }

  throw new Error(
    `Search timed out after ${MAX_ATTEMPTS} attempts (~${Math.round((MAX_ATTEMPTS * POLL_INTERVAL_MS) / 1000)}s). Please try again.`,
  );
}
