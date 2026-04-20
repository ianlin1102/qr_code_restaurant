-- ========== DB Roles (idempotent) ==========
DO $$ BEGIN
  CREATE ROLE app_user LOGIN PASSWORD 'placeholder_set_by_env';
EXCEPTION WHEN duplicate_object THEN RAISE NOTICE 'app_user exists'; END $$;

DO $$ BEGIN
  CREATE ROLE platform_admin LOGIN PASSWORD 'placeholder_set_by_env' BYPASSRLS;
EXCEPTION WHEN duplicate_object THEN RAISE NOTICE 'platform_admin exists'; END $$;

DO $$ BEGIN
  CREATE ROLE system_worker LOGIN PASSWORD 'placeholder_set_by_env' BYPASSRLS;
EXCEPTION WHEN duplicate_object THEN RAISE NOTICE 'system_worker exists'; END $$;

GRANT platform_admin TO app_user;

GRANT CONNECT ON DATABASE qr_order TO app_user, platform_admin, system_worker;
GRANT USAGE ON SCHEMA public TO app_user, platform_admin, system_worker;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user, platform_admin, system_worker;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO app_user, platform_admin, system_worker;

-- Future tables auto-GRANT (Task 5/H/I incremental schema won't need re-GRANT)
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user, platform_admin, system_worker;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE ON SEQUENCES TO app_user, platform_admin, system_worker;

-- ========== RLS on store_id tables (strict mode, no fallback) ==========
--
-- NOTE on platform_audit_log: this table uses target_store_id (not store_id),
-- so the dynamic SQL below auto-skips it. RLS is intentionally NOT applied —
-- platform_audit_log is platform-scope audit (cross-tenant by design).
-- platform_admin role has BYPASSRLS for direct read access (DP-PF-4 决议 A).
--
-- TYPE CAST NOTE (β 决议, L1 verify 方法学教训):
-- store_id is TEXT (per schema.prisma — storeId String @map("store_id"), not @db.Uuid).
-- current_setting() returns text. Both sides explicitly cast to ::text for type alignment.
-- This is deliberate (not missing cast): storeId values are cuid format strings,
-- NOT UUID-format, so ::uuid cast would fail at runtime.
-- Verify: SELECT data_type FROM information_schema.columns
--         WHERE table_schema='public' AND column_name='store_id'; → all 'text'
--
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT table_name FROM information_schema.columns
           WHERE column_name = 'store_id' AND table_schema = 'public'
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format($p$
      CREATE POLICY tenant_isolation ON %I
      USING (store_id::text = current_setting('app.current_store_id')::text)
      WITH CHECK (store_id::text = current_setting('app.current_store_id')::text)
    $p$, t);
  END LOOP;
END $$;

-- DEPLOY ORDER: This RLS migration must be applied BEFORE Phase H
-- import-legacy-json.ts runs. If import runs without RLS active, rows can
-- leak across tenants (no store_id filter enforced at DB layer).
-- Verify in Phase H startup:
--   psql -c "SELECT relname, relrowsecurity FROM pg_class
--            WHERE relname IN ('orders', 'sessions', 'menu_items', ...);"
-- All listed tables should show relrowsecurity = 't'.

-- ========== Partial unique: one draft per (session, device) ==========
-- NOTE: this is a schema-level index (not RLS-related), conceptually belongs
-- in 20260417000001_extend_schema. Placed here because Task 3 already shipped
-- (commit c831d3b8) and Rule 1 (incremental migration ironclad) prohibits
-- modifying published migrations. Adding to next available migration.
CREATE UNIQUE INDEX one_draft_per_device
  ON orders (session_id, device_id)
  WHERE status = 'draft';
