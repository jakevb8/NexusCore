-- Add OrgStatus enum
CREATE TYPE "OrgStatus" AS ENUM ('PENDING', 'ACTIVE', 'REJECTED');

-- Add status column to organizations (existing orgs default to ACTIVE so they aren't blocked)
ALTER TABLE "organizations" ADD COLUMN "status" "OrgStatus" NOT NULL DEFAULT 'ACTIVE';

-- Add invites foreign key to organizations (was missing from initial migration)
ALTER TABLE "invites" ADD CONSTRAINT "invites_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Rename EMPLOYEE -> ASSET_MANAGER and add VIEWER to Role enum
-- PostgreSQL doesn't support renaming enum values directly; we add new values first,
-- migrate data, then drop the old value.
ALTER TYPE "Role" ADD VALUE 'ASSET_MANAGER';
ALTER TYPE "Role" ADD VALUE 'VIEWER';

-- Migrate existing EMPLOYEE rows to VIEWER (least-privilege safe default)
UPDATE "users" SET "role" = 'VIEWER' WHERE "role" = 'EMPLOYEE';
UPDATE "invites" SET "role" = 'VIEWER' WHERE "role" = 'EMPLOYEE';

-- Change defaults
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'VIEWER';
ALTER TABLE "invites" ALTER COLUMN "role" SET DEFAULT 'VIEWER';

-- Note: PostgreSQL does not allow dropping enum values that may still be referenced.
-- The EMPLOYEE value is kept in the enum type for backward compatibility but is no
-- longer used in application code or defaults. A future cleanup migration can remove
-- it once confirmed no rows reference it.
