-- Seed the initial super-admin PlatformAdmin.
-- Password hash is a placeholder (bcrypt of 'changeme' with cost 10).
-- Operator MUST reset this password immediately after first deploy:
--   psql> UPDATE platform_admins SET password_hash = '<new bcrypt hash>' WHERE email = 'admin@saas.local';
--
-- Why in migration (not seed.ts): this record should only exist on fresh install.
-- seed.ts can be re-run (upsert), but we don't want seed.ts to know production admin credentials.

INSERT INTO platform_admins (id, email, password_hash, role, is_active, created_at)
VALUES (
  gen_random_uuid(),
  'admin@saas.local',
  -- bcrypt hash of 'changeme', cost 10. REPLACE IMMEDIATELY.
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
  'super-admin',
  true,
  now()
)
ON CONFLICT (email) DO NOTHING;
