-- Create the user-owned places_of_interest table.
-- Bridge until real auth exists: seed the single known dev user so the FK holds.
INSERT INTO users (id) VALUES ('00000000-0000-0000-0000-000000000001')
  ON CONFLICT (id) DO NOTHING;

CREATE TABLE places_of_interest (
  poi_id              uuid      PRIMARY KEY,                         -- app-supplied uuidv7, no DB default
  user_id             uuid      NOT NULL REFERENCES users(id),
  label               text      NOT NULL,
  address             text      NOT NULL,
  geocode             jsonb     NOT NULL,                            -- { "lat": .., "lng": .. }
  created_at_utc      timestamp NOT NULL DEFAULT (now() AT TIME ZONE 'UTC'),
  last_updated_at_utc timestamp NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')
);

CREATE INDEX places_of_interest_user_id_idx ON places_of_interest (user_id);
