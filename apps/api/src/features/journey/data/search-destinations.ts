import type { PoolClient } from "pg";

export interface DestinationInsert {
  category: string;
  name: string;
  address: string;
  walkMinutes: number | null;
  transitMinutes: number | null;
  cycleMinutes: number | null;
  driveMinutes: number | null;
  metadata: Record<string, unknown>;
}

export interface DestinationDbRow {
  category: string;
  name: string;
  address: string;
  walkMinutes: number | null;
  transitMinutes: number | null;
  cycleMinutes: number | null;
  driveMinutes: number | null;
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

  // Build parameter placeholders: each row contributes 9 params
  const values: unknown[] = [];
  const placeholders = rows.map((row, i) => {
    const base = i * 9;
    values.push(
      searchId,
      row.category,
      row.name,
      row.address,
      row.walkMinutes,
      row.transitMinutes,
      row.cycleMinutes,
      row.driveMinutes,
      JSON.stringify(row.metadata),
    );
    return `($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5},$${base + 6},$${base + 7},$${base + 8},$${base + 9})`;
  });

  const sql = `
    INSERT INTO search_destinations
      (search_id, category, name, address, walk_minutes, transit_minutes, cycle_minutes, drive_minutes, metadata)
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
    walk_minutes: number | null;
    transit_minutes: number | null;
    cycle_minutes: number | null;
    drive_minutes: number | null;
    metadata: Record<string, unknown>;
  }>(
    `SELECT category, name, address, walk_minutes, transit_minutes, cycle_minutes, drive_minutes, metadata
     FROM search_destinations
     WHERE search_id=$1`,
    [searchId],
  );

  return rows.map((r) => ({
    category: r.category,
    name: r.name,
    address: r.address,
    walkMinutes: r.walk_minutes,
    transitMinutes: r.transit_minutes,
    cycleMinutes: r.cycle_minutes,
    driveMinutes: r.drive_minutes,
    metadata: r.metadata,
  }));
};
