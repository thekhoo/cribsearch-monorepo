-- Migrate timestamp columns to UTC wall-clock timestamps and rename for clarity.
-- Converts timestamptz columns to timestamp (without time zone), preserving the
-- instant as UTC wall-clock via USING (col AT TIME ZONE 'UTC').
-- Renames: created_at → created_at_utc, updated_at → last_updated_at_utc.
-- Adds created_at_utc and last_updated_at_utc to search_destinations (had none).
-- Drops gen_random_uuid() defaults from searches.search_id and
-- search_destinations.search_destination_id — the application now supplies uuidv7 ids.
-- users.id and folders.id defaults are left unchanged (no service insert path).

-- users: rename and convert created_at only
ALTER TABLE users RENAME COLUMN created_at TO created_at_utc;
ALTER TABLE users
  ALTER COLUMN created_at_utc DROP DEFAULT,
  ALTER COLUMN created_at_utc TYPE timestamp USING (created_at_utc AT TIME ZONE 'UTC'),
  ALTER COLUMN created_at_utc SET DEFAULT (now() AT TIME ZONE 'UTC');

-- folders: rename and convert both timestamp columns
ALTER TABLE folders RENAME COLUMN created_at TO created_at_utc;
ALTER TABLE folders
  ALTER COLUMN created_at_utc DROP DEFAULT,
  ALTER COLUMN created_at_utc TYPE timestamp USING (created_at_utc AT TIME ZONE 'UTC'),
  ALTER COLUMN created_at_utc SET DEFAULT (now() AT TIME ZONE 'UTC');

ALTER TABLE folders RENAME COLUMN updated_at TO last_updated_at_utc;
ALTER TABLE folders
  ALTER COLUMN last_updated_at_utc DROP DEFAULT,
  ALTER COLUMN last_updated_at_utc TYPE timestamp USING (last_updated_at_utc AT TIME ZONE 'UTC'),
  ALTER COLUMN last_updated_at_utc SET DEFAULT (now() AT TIME ZONE 'UTC');

-- searches: rename and convert both timestamp columns
ALTER TABLE searches RENAME COLUMN created_at TO created_at_utc;
ALTER TABLE searches
  ALTER COLUMN created_at_utc DROP DEFAULT,
  ALTER COLUMN created_at_utc TYPE timestamp USING (created_at_utc AT TIME ZONE 'UTC'),
  ALTER COLUMN created_at_utc SET DEFAULT (now() AT TIME ZONE 'UTC');

ALTER TABLE searches RENAME COLUMN updated_at TO last_updated_at_utc;
ALTER TABLE searches
  ALTER COLUMN last_updated_at_utc DROP DEFAULT,
  ALTER COLUMN last_updated_at_utc TYPE timestamp USING (last_updated_at_utc AT TIME ZONE 'UTC'),
  ALTER COLUMN last_updated_at_utc SET DEFAULT (now() AT TIME ZONE 'UTC');

-- search_destinations: add timestamp columns (had none before)
ALTER TABLE search_destinations
  ADD COLUMN created_at_utc      timestamp NOT NULL DEFAULT (now() AT TIME ZONE 'UTC'),
  ADD COLUMN last_updated_at_utc timestamp NOT NULL DEFAULT (now() AT TIME ZONE 'UTC');

-- Drop gen_random_uuid() defaults from application-owned PKs.
-- The application layer now generates uuidv7 IDs before insert.
ALTER TABLE searches ALTER COLUMN search_id DROP DEFAULT;
ALTER TABLE search_destinations ALTER COLUMN search_destination_id DROP DEFAULT;
