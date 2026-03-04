-- Add OrgStatus enum
CREATE TYPE "OrgStatus" AS ENUM ('PENDING', 'ACTIVE', 'REJECTED');

-- Add status column to organizations (existing orgs default to ACTIVE so they aren't blocked)
ALTER TABLE "organizations" ADD COLUMN "status" "OrgStatus" NOT NULL DEFAULT 'ACTIVE';

-- Add invites foreign key to organizations (was missing from initial migration)
ALTER TABLE "invites" ADD CONSTRAINT "invites_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add new Role enum values.
-- NOTE: PostgreSQL does not allow using a newly-added enum value in the same transaction
-- where it was added (error 55P04). The UPDATE and SET DEFAULT statements that reference
-- ASSET_MANAGER and VIEWER are therefore placed in the next migration (000002) which runs
-- in a separate transaction after this one has been committed.
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'ASSET_MANAGER';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'VIEWER';
