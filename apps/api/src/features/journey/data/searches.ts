import type { PoolClient } from "pg";
import type { JourneySearchRequest, RequestStatus } from "@cribsearch/shared-types";

export interface SearchRow {
  id: string;
  status: RequestStatus;
  request: JourneySearchRequest;
  error: string | null;
  createdAt: string;
}

/** Insert a new search row with status='Pending'. Returns id and status. */
export const insertSearch = async (
  client: PoolClient,
  request: JourneySearchRequest,
): Promise<{ id: string; status: "Pending" }> => {
  const { rows } = await client.query<{ id: string }>(
    `INSERT INTO searches (status, request) VALUES ('Pending', $1) RETURNING id`,
    [JSON.stringify(request)],
  );
  const row = rows[0];
  if (!row) {
    throw new Error("insertSearch: no row returned from INSERT");
  }
  return { id: row.id, status: "Pending" };
};

/** Transition a search to Processing. */
export const markProcessing = async (
  client: PoolClient,
  id: string,
): Promise<void> => {
  await client.query(
    `UPDATE searches SET status='Processing', updated_at=now() WHERE id=$1`,
    [id],
  );
};

/** Set the terminal status (Complete, PartialFailure, Failed) and optional error. */
export const updateResult = async (
  client: PoolClient,
  id: string,
  status: "Complete" | "PartialFailure" | "Failed",
  error?: string,
): Promise<void> => {
  await client.query(
    `UPDATE searches SET status=$2, error=$3, updated_at=now() WHERE id=$1`,
    [id, status, error ?? null],
  );
};

/** Fetch a single search row by id. Returns null for unknown or non-uuid ids. */
export const getSearchRow = async (
  client: PoolClient,
  id: string,
): Promise<SearchRow | null> => {
  try {
    const { rows } = await client.query<{
      id: string;
      status: RequestStatus;
      request: JourneySearchRequest;
      error: string | null;
      created_at: Date;
    }>(
      `SELECT id, status, request, error, created_at FROM searches WHERE id=$1`,
      [id],
    );
    const row = rows[0];
    if (!row) return null;
    return {
      id: row.id,
      status: row.status,
      request: row.request,
      error: row.error,
      createdAt: row.created_at.toISOString(),
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
