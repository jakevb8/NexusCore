-- This migration runs in a separate transaction from 20260303000001, which is required
-- because PostgreSQL (error 55P04) does not allow using a newly-added enum value
-- (ASSET_MANAGER, VIEWER) in the same transaction where ALTER TYPE ... ADD VALUE ran.

-- Migrate existing EMPLOYEE rows to VIEWER (least-privilege safe default)
UPDATE "users" SET "role" = 'VIEWER' WHERE "role" = 'EMPLOYEE';
UPDATE "invites" SET "role" = 'VIEWER' WHERE "role" = 'EMPLOYEE';

-- Update column defaults from EMPLOYEE to VIEWER
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'VIEWER';
ALTER TABLE "invites" ALTER COLUMN "role" SET DEFAULT 'VIEWER';

-- Note: PostgreSQL does not allow dropping enum values that may still be in-use.
-- The EMPLOYEE value is retained in the enum type. A future cleanup migration can
-- remove it once no rows reference it (confirmed by the UPDATEs above).
