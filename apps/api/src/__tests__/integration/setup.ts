import { afterAll } from "vitest";
import { closePool } from "../../shared/db/pool";

process.env.PGHOST ??= "localhost";
process.env.PGPORT ??= "5432";
process.env.PGUSER ??= "cribsearch";
process.env.PGPASSWORD ??= "cribsearch";
process.env.PGDATABASE ??= "local_cribsearch";
process.env.PGSSLMODE ??= "disable";
delete process.env.JOURNEY_QUEUE_URL; // enqueue becomes a no-op in tests

afterAll(async () => {
  await closePool();
});
