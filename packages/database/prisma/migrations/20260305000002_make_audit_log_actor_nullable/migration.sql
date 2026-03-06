-- Make actorId nullable and set ON DELETE SET NULL so that removing a user
-- preserves their audit history (actorId becomes NULL) instead of blocking
-- the delete with a FK constraint violation.

-- 1. Drop the existing NOT NULL constraint and foreign key
ALTER TABLE "audit_logs" DROP CONSTRAINT IF EXISTS "audit_logs_actorId_fkey";

-- 2. Make the column nullable
ALTER TABLE "audit_logs" ALTER COLUMN "actorId" DROP NOT NULL;

-- 3. Re-add the foreign key with ON DELETE SET NULL
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey"
    FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
