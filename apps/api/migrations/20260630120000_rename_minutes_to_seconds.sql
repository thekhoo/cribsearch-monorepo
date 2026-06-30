-- Travel durations are now stored in seconds (finer granularity than minutes).
-- Rename the per-mode *_minutes columns to *_seconds. The existing *_distance_m
-- columns (defined in the init migration but previously unwired) now carry the
-- per-mode travel distance in meters.
ALTER TABLE search_destinations RENAME COLUMN walk_minutes TO walk_seconds;
ALTER TABLE search_destinations RENAME COLUMN transit_minutes TO transit_seconds;
ALTER TABLE search_destinations RENAME COLUMN cycle_minutes TO cycle_seconds;
ALTER TABLE search_destinations RENAME COLUMN drive_minutes TO drive_seconds;
