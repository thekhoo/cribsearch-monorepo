import type { PoolClient } from "pg";
import { uuidv7 } from "uuidv7";

export interface DestinationInsert {
  category: string;
  name: string;
  address: string;
  walkSeconds: number | null;
  walkMeters: number | null;
  transitSeconds: number | null;
  transitMeters: number | null;
  cycleSeconds: number | null;
  cycleMeters: number | null;
  driveSeconds: number | null;
  driveMeters: number | null;
  metadata: Record<string, unknown>;
}

export interface DestinationDbRow {
  category: string;
  name: string;
  address: string;
  walkSeconds: number | null;
  walkMeters: number | null;
  transitSeconds: number | null;
  transitMeters: number | null;
  cycleSeconds: number | null;
  cycleMeters: number | null;
  driveSeconds: number | null;
  driveMeters: number | null;
  metadata: Record<string, unknown>;
}

/**
 * Bulk-insert destinations for a search in a single parameterized statement.
 * Uses ON CONFLICT DO NOTHING on the (search_id, address) unique constraint.
 */
export const insertDestinations = async (
  client: PoolClient,
  searchId: string,
  rows: DestinationInsert[],
): Promise<void> => {
  if (rows.length === 0) return;

  // Build parameter placeholders: each row contributes 14 params
  const values: unknown[] = [];
  const placeholders = rows.map((row, i) => {
    const base = i * 14;
    values.push(
      uuidv7(),
      searchId,
      row.category,
      row.name,
      row.address,
      row.walkSeconds,
      row.walkMeters,
      row.transitSeconds,
      row.transitMeters,
      row.cycleSeconds,
      row.cycleMeters,
      row.driveSeconds,
      row.driveMeters,
      JSON.stringify(row.metadata),
    );
    return `($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5},$${base + 6},$${base + 7},$${base + 8},$${base + 9},$${base + 10},$${base + 11},$${base + 12},$${base + 13},$${base + 14})`;
  });

  const sql = `
    INSERT INTO search_destinations
      (search_destination_id, search_id, category, name, address, walk_seconds, walk_distance_m, transit_seconds, transit_distance_m, cycle_seconds, cycle_distance_m, drive_seconds, drive_distance_m, metadata)
    VALUES
      ${placeholders.join(",")}
    ON CONFLICT (search_id, address) DO NOTHING
  `;

  await client.query(sql, values);
};

/** Fetch all destination rows for a search. */
export const getDestinations = async (
  client: PoolClient,
  searchId: string,
): Promise<DestinationDbRow[]> => {
  const { rows } = await client.query<{
    category: string;
    name: string;
    address: string;
    walk_seconds: number | null;
    walk_distance_m: number | null;
    transit_seconds: number | null;
    transit_distance_m: number | null;
    cycle_seconds: number | null;
    cycle_distance_m: number | null;
    drive_seconds: number | null;
    drive_distance_m: number | null;
    metadata: Record<string, unknown>;
  }>(
    `SELECT category, name, address, walk_seconds, walk_distance_m, transit_seconds, transit_distance_m, cycle_seconds, cycle_distance_m, drive_seconds, drive_distance_m, metadata
     FROM search_destinations
     WHERE search_id=$1`,
    [searchId],
  );

  return rows.map((r) => ({
    category: r.category,
    name: r.name,
    address: r.address,
    walkSeconds: r.walk_seconds,
    walkMeters: r.walk_distance_m,
    transitSeconds: r.transit_seconds,
    transitMeters: r.transit_distance_m,
    cycleSeconds: r.cycle_seconds,
    cycleMeters: r.cycle_distance_m,
    driveSeconds: r.drive_seconds,
    driveMeters: r.drive_distance_m,
    metadata: r.metadata,
  }));
};
