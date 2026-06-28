import { getPool } from "../../shared/db/postgres";

export const truncateAll = async (): Promise<void> => {
  const pool = await getPool();
  await pool.query("TRUNCATE searches, search_destinations CASCADE");
};
