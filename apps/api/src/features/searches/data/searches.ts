import type { PoolClient } from "pg";
import type {
  SearchRequest,
  RequestStatus,
  SearchSummary,
} from "@cribsearch/shared-types";
import { uuidv7 } from "uuidv7";

export interface SearchRow {
  searchId: string;
  status: RequestStatus;
  request: SearchRequest;
  statusReason: string | null;
  createdAt: string;
}

/** Insert a new search row with status='Pending'. Returns searchId and status. */
export const insertSearch = async (
  client: PoolClient,
  userId: string,
  request: SearchRequest,
): Promise<{ searchId: string; status: "Pending" }> => {
  const searchId = uuidv7();
  const { rows } = await client.query<{ search_id: string }>(
    `INSERT INTO searches (search_id, user_id, status, request) VALUES ($1, $2, 'Pending', $3) RETURNING search_id`,
    [searchId, userId, JSON.stringify(request)],
  );
  const row = rows[0];
  if (!row) {
    throw new Error("insertSearch: no row returned from INSERT");
  }
  return { searchId: row.search_id, status: "Pending" };
};

/** Transition a search to Processing. */
export const markProcessing = async (
  client: PoolClient,
  id: string,
): Promise<void> => {
  await client.query(
    `UPDATE searches SET status='Processing', last_updated_at_utc = (now() AT TIME ZONE 'UTC') WHERE search_id=$1`,
    [id],
  );
};

/** Set the terminal status (Complete, PartialFailure, Failed) and optional statusReason. */
export const updateResult = async (
  client: PoolClient,
  id: string,
  status: "Complete" | "PartialFailure" | "Failed",
  statusReason?: string,
): Promise<void> => {
  await client.query(
    `UPDATE searches SET status=$2, status_reason=$3, last_updated_at_utc = (now() AT TIME ZONE 'UTC') WHERE search_id=$1`,
    [id, status, statusReason ?? null],
  );
};

/** Fetch a single search row by search_id. Returns null for unknown or non-uuid ids.
 * When userId is provided, also filters by user_id (ownership check). */
export const getSearchRow = async (
  client: PoolClient,
  id: string,
  userId?: string,
): Promise<SearchRow | null> => {
  type SearchRowRaw = {
    search_id: string;
    status: RequestStatus;
    request: SearchRequest;
    status_reason: string | null;
    created_at_utc: Date;
  };
  try {
    const { rows } =
      userId === undefined
        ? await client.query<SearchRowRaw>(
            `SELECT search_id, status, request, status_reason, created_at_utc FROM searches WHERE search_id=$1`,
            [id],
          )
        : await client.query<SearchRowRaw>(
            `SELECT search_id, status, request, status_reason, created_at_utc FROM searches WHERE search_id=$1 AND user_id=$2`,
            [id, userId],
          );
    const row = rows[0];
    if (!row) return null;
    return {
      searchId: row.search_id,
      status: row.status,
      request: row.request,
      statusReason: row.status_reason,
      createdAt: row.created_at_utc.toISOString(),
    };
  } catch (err: unknown) {
    // Postgres error code 22P02 = invalid_text_representation (e.g. non-uuid id)
    if (
      err !== null &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code: unknown }).code === "22P02"
    ) {
      return null;
    }
    throw err;
  }
};

/** List all search summaries for a user, newest-first. */
export const listSearchSummaries = async (
  client: PoolClient,
  userId: string,
): Promise<SearchSummary[]> => {
  const { rows } = await client.query<{
    search_id: string;
    status: RequestStatus;
    request: SearchRequest;
    folder_id: string | null;
    created_at_utc: Date;
  }>(
    `SELECT search_id, status, request, folder_id, created_at_utc
     FROM searches
     WHERE user_id = $1
     ORDER BY created_at_utc DESC`,
    [userId],
  );
  return rows.map((row) => ({
    id: row.search_id,
    status: row.status,
    nickname: row.request.nickname,
    address: row.request.address,
    folderId: row.folder_id ?? undefined,
    createdAt: row.created_at_utc.toISOString(),
  }));
};
