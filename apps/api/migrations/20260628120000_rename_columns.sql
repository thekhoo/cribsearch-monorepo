-- Rename columns for clarity and naming consistency.
-- searches.id        → search_id        (unambiguous PK name)
-- searches.error     → status_reason    (describes the status context, not just an error)
-- search_destinations.id → search_destination_id (unambiguous PK name)
-- Note: created_at/updated_at remain as timestamptz (UTC internally) — no change needed.

-- searches: rename id and error columns
ALTER TABLE searches RENAME COLUMN id TO search_id;
ALTER TABLE searches RENAME COLUMN error TO status_reason;

-- search_destinations: rename id column
ALTER TABLE search_destinations RENAME COLUMN id TO search_destination_id;
