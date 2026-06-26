-- =============================================================================
-- bootstrap.sql  --  ONE-TIME setup, run as the Neon default/owner role
-- =============================================================================
--
-- Run this script once against the Neon project's default database using the
-- default/owner role (`neondb_owner`) via psql, over the DIRECT endpoint
-- (NOT the -pooler host) so that `\c` between databases works:
--
--   psql "postgresql://neondb_owner:<PWD>@ep-xxxx.<region>.aws.neon.tech/neondb?sslmode=require" \
--        -f apps/api/db/bootstrap.sql
--
-- WHY THIS IS NOT AN ATLAS MIGRATION:
--   CREATE DATABASE and CREATE ROLE are cluster-level commands that cannot run
--   inside a transaction. Atlas versioned migrations are wrapped in a
--   transaction, so these statements must live outside Atlas.
--
-- THREE-ROLE MODEL (per universe):
--   *_admin  -- Owns the schema and runs migrations (DDL). The CI migrate job
--               connects as this role.
--   *_rw     -- Application runtime role (DML only: SELECT, INSERT, UPDATE,
--               DELETE on tables; USAGE + SELECT on sequences).
--   *_ro     -- Read-only consumers (SELECT on tables; USAGE + SELECT on
--               sequences).
--
-- OWNERSHIP TRANSFERS:
--   Neon (like other managed Postgres) exposes no true SUPERUSER, so each block
--   GRANTs its *_admin role to CURRENT_USER before `ALTER DATABASE/SCHEMA ...
--   OWNER` -- those statements require being able to SET ROLE to the new owner.
--
-- BEFORE RUNNING:
--   Replace every CHANGE_ME_* placeholder password below with a strong, unique
--   secret and store the credentials in your secrets manager / SSM Parameter
--   Store.
-- =============================================================================

-- ===========================================================================
-- DEVELOPMENT
-- ===========================================================================
CREATE DATABASE development_cribsearch;

CREATE ROLE development_cribsearch_admin LOGIN PASSWORD 'CHANGE_ME_DEV_ADMIN'; -- owns schema, runs migrations (DDL); CI migrate job connects as this
CREATE ROLE development_cribsearch_rw    LOGIN PASSWORD 'CHANGE_ME_DEV_RW';    -- application runtime (DML only)
CREATE ROLE development_cribsearch_ro    LOGIN PASSWORD 'CHANGE_ME_DEV_RO';    -- read-only consumers

REVOKE CONNECT ON DATABASE development_cribsearch FROM PUBLIC;
GRANT  CONNECT ON DATABASE development_cribsearch
  TO development_cribsearch_admin, development_cribsearch_rw, development_cribsearch_ro;

-- Membership so this runner can transfer ownership below (no superuser on Neon).
GRANT development_cribsearch_admin TO CURRENT_USER;
ALTER DATABASE development_cribsearch OWNER TO development_cribsearch_admin;

\c development_cribsearch
ALTER SCHEMA public OWNER TO development_cribsearch_admin;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE, CREATE ON SCHEMA public TO development_cribsearch_admin;
GRANT USAGE          ON SCHEMA public TO development_cribsearch_rw;
GRANT USAGE          ON SCHEMA public TO development_cribsearch_ro;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES   IN SCHEMA public TO development_cribsearch_rw;
GRANT USAGE, SELECT                  ON ALL SEQUENCES IN SCHEMA public TO development_cribsearch_rw;
GRANT SELECT                         ON ALL TABLES   IN SCHEMA public TO development_cribsearch_ro;
ALTER DEFAULT PRIVILEGES FOR ROLE development_cribsearch_admin IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO development_cribsearch_rw;
ALTER DEFAULT PRIVILEGES FOR ROLE development_cribsearch_admin IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO development_cribsearch_rw;
ALTER DEFAULT PRIVILEGES FOR ROLE development_cribsearch_admin IN SCHEMA public
  GRANT SELECT ON TABLES TO development_cribsearch_ro;
ALTER DEFAULT PRIVILEGES FOR ROLE development_cribsearch_admin IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO development_cribsearch_ro;
\c neondb

-- ===========================================================================
-- STAGING
-- ===========================================================================
CREATE DATABASE staging_cribsearch;

CREATE ROLE staging_cribsearch_admin LOGIN PASSWORD 'CHANGE_ME_STAGING_ADMIN'; -- owns schema, runs migrations (DDL); CI migrate job connects as this
CREATE ROLE staging_cribsearch_rw    LOGIN PASSWORD 'CHANGE_ME_STAGING_RW';    -- application runtime (DML only)
CREATE ROLE staging_cribsearch_ro    LOGIN PASSWORD 'CHANGE_ME_STAGING_RO';    -- read-only consumers

REVOKE CONNECT ON DATABASE staging_cribsearch FROM PUBLIC;
GRANT  CONNECT ON DATABASE staging_cribsearch
  TO staging_cribsearch_admin, staging_cribsearch_rw, staging_cribsearch_ro;

-- Membership so this runner can transfer ownership below (no superuser on Neon).
GRANT staging_cribsearch_admin TO CURRENT_USER;
ALTER DATABASE staging_cribsearch OWNER TO staging_cribsearch_admin;

\c staging_cribsearch
ALTER SCHEMA public OWNER TO staging_cribsearch_admin;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE, CREATE ON SCHEMA public TO staging_cribsearch_admin;
GRANT USAGE          ON SCHEMA public TO staging_cribsearch_rw;
GRANT USAGE          ON SCHEMA public TO staging_cribsearch_ro;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES   IN SCHEMA public TO staging_cribsearch_rw;
GRANT USAGE, SELECT                  ON ALL SEQUENCES IN SCHEMA public TO staging_cribsearch_rw;
GRANT SELECT                         ON ALL TABLES   IN SCHEMA public TO staging_cribsearch_ro;
ALTER DEFAULT PRIVILEGES FOR ROLE staging_cribsearch_admin IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO staging_cribsearch_rw;
ALTER DEFAULT PRIVILEGES FOR ROLE staging_cribsearch_admin IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO staging_cribsearch_rw;
ALTER DEFAULT PRIVILEGES FOR ROLE staging_cribsearch_admin IN SCHEMA public
  GRANT SELECT ON TABLES TO staging_cribsearch_ro;
ALTER DEFAULT PRIVILEGES FOR ROLE staging_cribsearch_admin IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO staging_cribsearch_ro;
\c neondb

-- ===========================================================================
-- PRODUCTION
-- ===========================================================================
CREATE DATABASE production_cribsearch;

CREATE ROLE production_cribsearch_admin LOGIN PASSWORD 'CHANGE_ME_PROD_ADMIN'; -- owns schema, runs migrations (DDL); CI migrate job connects as this
CREATE ROLE production_cribsearch_rw    LOGIN PASSWORD 'CHANGE_ME_PROD_RW';    -- application runtime (DML only)
CREATE ROLE production_cribsearch_ro    LOGIN PASSWORD 'CHANGE_ME_PROD_RO';    -- read-only consumers

REVOKE CONNECT ON DATABASE production_cribsearch FROM PUBLIC;
GRANT  CONNECT ON DATABASE production_cribsearch
  TO production_cribsearch_admin, production_cribsearch_rw, production_cribsearch_ro;

-- Membership so this runner can transfer ownership below (no superuser on Neon).
GRANT production_cribsearch_admin TO CURRENT_USER;
ALTER DATABASE production_cribsearch OWNER TO production_cribsearch_admin;

\c production_cribsearch
ALTER SCHEMA public OWNER TO production_cribsearch_admin;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE, CREATE ON SCHEMA public TO production_cribsearch_admin;
GRANT USAGE          ON SCHEMA public TO production_cribsearch_rw;
GRANT USAGE          ON SCHEMA public TO production_cribsearch_ro;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES   IN SCHEMA public TO production_cribsearch_rw;
GRANT USAGE, SELECT                  ON ALL SEQUENCES IN SCHEMA public TO production_cribsearch_rw;
GRANT SELECT                         ON ALL TABLES   IN SCHEMA public TO production_cribsearch_ro;
ALTER DEFAULT PRIVILEGES FOR ROLE production_cribsearch_admin IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO production_cribsearch_rw;
ALTER DEFAULT PRIVILEGES FOR ROLE production_cribsearch_admin IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO production_cribsearch_rw;
ALTER DEFAULT PRIVILEGES FOR ROLE production_cribsearch_admin IN SCHEMA public
  GRANT SELECT ON TABLES TO production_cribsearch_ro;
ALTER DEFAULT PRIVILEGES FOR ROLE production_cribsearch_admin IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO production_cribsearch_ro;
\c neondb
