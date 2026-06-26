-- First versioned migration: core tables for cribsearch.
-- Postgres 16 — gen_random_uuid() is built-in, no extension needed.
-- Tables are created in FK dependency order:
--   users -> folders -> searches -> search_destinations

-- users: STUB. single user today; real auth/ownership deferred
CREATE TABLE users (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL    DEFAULT now()
);

-- folders: user-named grouping of Searches
CREATE TABLE folders (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        NOT NULL,
  user_id    uuid        REFERENCES users(id),
  created_at timestamptz NOT NULL    DEFAULT now(),
  updated_at timestamptz NOT NULL    DEFAULT now()
);

-- searches: durable result + its originating request
CREATE TABLE searches (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  status     text        NOT NULL
    CHECK (status IN ('Pending','Processing','Complete','PartialFailure','Failed')),
  request    jsonb       NOT NULL,
  error      text,
  folder_id  uuid        REFERENCES folders(id) ON DELETE SET NULL,
  user_id    uuid        REFERENCES users(id),
  created_at timestamptz NOT NULL    DEFAULT now(),
  updated_at timestamptz NOT NULL    DEFAULT now()
);
CREATE INDEX ON searches (status);
CREATE INDEX ON searches (folder_id);

-- search_destinations: a place + its per-mode travel stats
CREATE TABLE search_destinations (
  id                 uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id          uuid  NOT NULL REFERENCES searches(id) ON DELETE CASCADE,
  category           text  NOT NULL,
  name               text  NOT NULL,
  address            text  NOT NULL,
  walk_minutes       int,
  walk_distance_m    int,
  transit_minutes    int,
  transit_distance_m int,
  cycle_minutes      int,
  cycle_distance_m   int,
  drive_minutes      int,
  drive_distance_m   int,
  metadata           jsonb NOT NULL DEFAULT '{}',
  UNIQUE (search_id, address)
);
CREATE INDEX ON search_destinations (search_id);
