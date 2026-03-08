-- Drop the global unique constraint on sku and replace with a per-org compound unique constraint.
-- This allows different organizations to have assets with the same SKU.

DROP INDEX IF EXISTS "assets_sku_key";
ALTER TABLE "assets" DROP CONSTRAINT IF EXISTS "assets_sku_key";

CREATE UNIQUE INDEX "assets_sku_organizationId_key" ON "assets"("sku", "organizationId");
