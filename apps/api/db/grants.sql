-- =============================================================================
-- grants.sql  --  REPEATABLE, IDEMPOTENT permission enforcement
-- =============================================================================
--
-- PURPOSE:
--   Re-applies the three-role (admin/rw/ro) schema-level GRANTs and ALTER
--   DEFAULT PRIVILEGES on every deploy, ensuring tables created by Atlas
--   migrations are immediately accessible to the rw and ro roles without
--   manual intervention. Postgres GRANTs are idempotent, so this script is
--   safe to re-run any number of times.
--
-- HOW TO RUN:
--   psql "$DATABASE_URL" -v universe=production -v ON_ERROR_STOP=1 \
--        -f apps/api/db/grants.sql
--
--   The `universe` variable selects which set of roles to target
--   (development | staging | production). If omitted it defaults to
--   `production`.
--
-- NOTE: Atlas has no native repeatable migrations, so this script is applied
--   via psql after `atlas migrate apply` on every CI deploy. See
--   .github/workflows/deploy.yml (migrate job) and ADR 0008.
-- =============================================================================

-- Default `universe` to `production` if the caller did not supply -v universe=...
\if :{?universe}
\else
  \set universe production
\endif

-- Derive the three per-universe role names by concatenation.
\set rw_role    :universe '_cribsearch_rw'
\set ro_role    :universe '_cribsearch_ro'
\set admin_role :universe '_cribsearch_admin'

-- ---------------------------------------------------------------------------
-- Schema-level USAGE grants (idempotent)
-- ---------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO :"rw_role";
GRANT USAGE ON SCHEMA public TO :"ro_role";

-- ---------------------------------------------------------------------------
-- Object-level grants on ALL existing tables / sequences (idempotent)
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES   IN SCHEMA public TO :"rw_role";
GRANT USAGE, SELECT                  ON ALL SEQUENCES IN SCHEMA public TO :"rw_role";
GRANT SELECT                         ON ALL TABLES   IN SCHEMA public TO :"ro_role";
GRANT USAGE, SELECT                  ON ALL SEQUENCES IN SCHEMA public TO :"ro_role";

-- ---------------------------------------------------------------------------
-- ALTER DEFAULT PRIVILEGES so future tables / sequences are also covered.
-- Mirrors the four ALTER DEFAULT PRIVILEGES blocks in bootstrap.sql.
-- ---------------------------------------------------------------------------
ALTER DEFAULT PRIVILEGES FOR ROLE :"admin_role" IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO :"rw_role";
ALTER DEFAULT PRIVILEGES FOR ROLE :"admin_role" IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO :"rw_role";
ALTER DEFAULT PRIVILEGES FOR ROLE :"admin_role" IN SCHEMA public
  GRANT SELECT ON TABLES TO :"ro_role";
ALTER DEFAULT PRIVILEGES FOR ROLE :"admin_role" IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO :"ro_role";
