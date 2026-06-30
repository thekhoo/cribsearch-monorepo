import type { PoolClient } from "pg";
import type { Poi, CreatePoiRequest, UpdatePoiRequest } from "@cribsearch/shared-types";
import type { GeoCoordinate } from "../../../shared/maps/maps-provider";
import { uuidv7 } from "uuidv7";

interface PoiRow {
  poi_id: string;
  user_id: string;
  label: string;
  address: string;
  geocode: GeoCoordinate;
  created_at_utc: Date;
  last_updated_at_utc: Date;
}

const mapRow = (row: PoiRow): Poi => ({
  id: row.poi_id,
  label: row.label,
  address: row.address,
  geocode: row.geocode,
});

const isInvalidUuidError = (err: unknown): boolean =>
  err !== null &&
  typeof err === "object" &&
  "code" in err &&
  (err as { code: unknown }).code === "22P02";

/** Insert a new POI row. Returns the created Poi (including geocode). */
export const insertPoi = async (
  client: PoolClient,
  userId: string,
  request: CreatePoiRequest,
  geocode: GeoCoordinate,
): Promise<Poi> => {
  const poiId = uuidv7();
  const { rows } = await client.query<PoiRow>(
    `INSERT INTO places_of_interest (poi_id, user_id, label, address, geocode)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING poi_id, user_id, label, address, geocode, created_at_utc, last_updated_at_utc`,
    [poiId, userId, request.label, request.address, JSON.stringify(geocode)],
  );
  const row = rows[0];
  if (!row) {
    throw new Error("insertPoi: no row returned from INSERT");
  }
  return mapRow(row);
};

/** List all POIs for a user, ordered by creation date descending. */
export const listPois = async (
  client: PoolClient,
  userId: string,
): Promise<Poi[]> => {
  const { rows } = await client.query<PoiRow>(
    `SELECT poi_id, user_id, label, address, geocode, created_at_utc, last_updated_at_utc
     FROM places_of_interest
     WHERE user_id = $1
     ORDER BY created_at_utc DESC`,
    [userId],
  );
  return rows.map(mapRow);
};

/** Fetch a single POI by id, scoped to the user. Returns null if not found or id is invalid. */
export const getPoiRow = async (
  client: PoolClient,
  userId: string,
  poiId: string,
): Promise<Poi | null> => {
  try {
    const { rows } = await client.query<PoiRow>(
      `SELECT poi_id, user_id, label, address, geocode, created_at_utc, last_updated_at_utc
       FROM places_of_interest
       WHERE poi_id = $1 AND user_id = $2`,
      [poiId, userId],
    );
    const row = rows[0];
    if (!row) return null;
    return mapRow(row);
  } catch (err: unknown) {
    // Postgres error code 22P02 = invalid_text_representation (e.g. non-uuid id)
    if (isInvalidUuidError(err)) {
      return null;
    }
    throw err;
  }
};

/**
 * Update a POI's label, address, and optionally geocode. Returns null if the POI
 * does not exist or is not owned by the user.
 */
export const updatePoi = async (
  client: PoolClient,
  userId: string,
  poiId: string,
  request: UpdatePoiRequest,
  geocode: GeoCoordinate | undefined,
): Promise<Poi | null> => {
  try {
    const { rows } = geocode !== undefined
      ? await client.query<PoiRow>(
          `UPDATE places_of_interest
           SET label = $3, address = $4, geocode = $5, last_updated_at_utc = (now() AT TIME ZONE 'UTC')
           WHERE poi_id = $1 AND user_id = $2
           RETURNING poi_id, user_id, label, address, geocode, created_at_utc, last_updated_at_utc`,
          [poiId, userId, request.label, request.address, JSON.stringify(geocode)],
        )
      : await client.query<PoiRow>(
          `UPDATE places_of_interest
           SET label = $3, address = $4, last_updated_at_utc = (now() AT TIME ZONE 'UTC')
           WHERE poi_id = $1 AND user_id = $2
           RETURNING poi_id, user_id, label, address, geocode, created_at_utc, last_updated_at_utc`,
          [poiId, userId, request.label, request.address],
        );
    const row = rows[0];
    if (!row) return null;
    return mapRow(row);
  } catch (err: unknown) {
    if (isInvalidUuidError(err)) {
      return null;
    }
    throw err;
  }
};

/** Delete a POI scoped to the user. Returns true if a row was deleted, false if not found. */
export const deletePoi = async (
  client: PoolClient,
  userId: string,
  poiId: string,
): Promise<boolean> => {
  try {
    const result = await client.query(
      `DELETE FROM places_of_interest WHERE poi_id = $1 AND user_id = $2`,
      [poiId, userId],
    );
    return (result.rowCount ?? 0) > 0;
  } catch (err: unknown) {
    if (isInvalidUuidError(err)) {
      return false;
    }
    throw err;
  }
};
