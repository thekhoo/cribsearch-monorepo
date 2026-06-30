import type {
  AmenityCategory,
  CreatePoiRequest,
  JourneySearchRequest,
  JourneySearchResponse,
  Poi,
  RequestStatus,
  Search,
  TransportMode,
  UpdatePoiRequest,
} from "@cribsearch/shared-types";
import { API_BASE_URL } from "./config";

export const HARDCODED_USER_ID = "00000000-0000-0000-0000-000000000001";

export interface SearchInput {
  address: string;
  modes: TransportMode[];
  amenityCategories: AmenityCategory[];
  attachedPois: Poi[];
}

export interface SearchResult {
  search: Search;
  partialFailure?: string;
}

const TERMINAL_STATUSES: ReadonlySet<RequestStatus> = new Set([
  "Complete",
  "PartialFailure",
  "Failed",
]);

const POLL_INTERVAL_MS = 1500;
const MAX_ATTEMPTS = 30;
const REQUEST_TIMEOUT_MS = 10000;

async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
}

async function fetchWithTimeout(url: string, options?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timerId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Request timed out");
    }
    throw err;
  } finally {
    clearTimeout(timerId);
  }
}

/**
 * Submit an async journey search to the API and poll until a terminal status
 * is reached, then return the completed Search.
 *
 * Throws on non-202 POST responses, poll failures, "Failed" status, or timeout.
 * Returns { search } on Complete, { search, partialFailure } on PartialFailure.
 */
export async function runSearch(input: SearchInput): Promise<SearchResult> {
  const requestBody: JourneySearchRequest = {
    address: input.address,
    modes: input.modes,
    amenityCategories: input.amenityCategories,
    pois: input.attachedPois.map((p) => ({ label: p.label, address: p.address })),
  };

  const postResponse = await fetchWithTimeout(`${API_BASE_URL}/cribsearch/v1/journey`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });

  if (postResponse.status !== 202) {
    const message = await extractErrorMessage(postResponse);
    throw new Error(`Failed to start search: ${message}`);
  }

  const { id } = (await postResponse.json()) as { id: string; status: RequestStatus };

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    await new Promise<void>((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

    const pollResponse = await fetchWithTimeout(`${API_BASE_URL}/cribsearch/v1/journey/${id}`);

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

    if (!Array.isArray(result.search.amenityGroups) || !Array.isArray(result.search.pois)) {
      throw new Error("Search completed but result data is malformed");
    }

    if (result.status === "PartialFailure") {
      return {
        search: result.search,
        partialFailure: result.error ?? "Some destinations could not be computed.",
      };
    }

    return { search: result.search };
  }

  throw new Error(
    `Search timed out after ${MAX_ATTEMPTS} attempts (~${Math.round((MAX_ATTEMPTS * POLL_INTERVAL_MS) / 1000)}s). Please try again.`,
  );
}

// ── POI endpoints ──────────────────────────────────────────────────

function buildPoiHeaders(withBody = false): HeadersInit {
  const headers: Record<string, string> = {
    "x-user-id": HARDCODED_USER_ID,
  };
  if (withBody) headers["Content-Type"] = "application/json";
  return headers;
}

/** Fetch all POIs for the hardcoded user. */
export async function listPois(): Promise<Poi[]> {
  const response = await fetchWithTimeout(`${API_BASE_URL}/cribsearch/v1/pois`, {
    headers: buildPoiHeaders(),
  });
  if (!response.ok) {
    const message = await extractErrorMessage(response);
    throw new Error(`Failed to load POIs: ${message}`);
  }
  return response.json() as Promise<Poi[]>;
}

/** Create a new POI and return the server-assigned record (with id and geocode). */
export async function createPoi(input: CreatePoiRequest): Promise<Poi> {
  const response = await fetchWithTimeout(`${API_BASE_URL}/cribsearch/v1/pois`, {
    method: "POST",
    headers: buildPoiHeaders(true),
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const message = await extractErrorMessage(response);
    throw new Error(message);
  }
  return response.json() as Promise<Poi>;
}

/** Update an existing POI and return the updated server record. */
export async function updatePoi(id: string, input: UpdatePoiRequest): Promise<Poi> {
  const response = await fetchWithTimeout(`${API_BASE_URL}/cribsearch/v1/pois/${id}`, {
    method: "PUT",
    headers: buildPoiHeaders(true),
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const message = await extractErrorMessage(response);
    throw new Error(message);
  }
  return response.json() as Promise<Poi>;
}

/** Delete a POI. Treats 204 as success; throws on any other non-ok status. */
export async function deletePoi(id: string): Promise<void> {
  const response = await fetchWithTimeout(`${API_BASE_URL}/cribsearch/v1/pois/${id}`, {
    method: "DELETE",
    headers: buildPoiHeaders(),
  });
  if (response.status === 204) return;
  if (!response.ok) {
    const message = await extractErrorMessage(response);
    throw new Error(message);
  }
}
