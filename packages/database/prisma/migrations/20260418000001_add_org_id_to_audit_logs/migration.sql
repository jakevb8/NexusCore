-- Add organizationId (plain text, no FK) to audit_logs so org-level events
-- (e.g. ORG_DELETED) survive after the organization row is removed.
ALTER TABLE "audit_logs" ADD COLUMN "organizationId" TEXT;

CREATE INDEX "audit_logs_organizationId_idx" ON "audit_logs"("organizationId");
