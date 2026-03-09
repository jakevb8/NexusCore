-- CreateTable
CREATE TABLE "kafka_events" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "assetName" TEXT NOT NULL,
    "previousStatus" TEXT NOT NULL,
    "newStatus" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kafka_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "kafka_events_organizationId_idx" ON "kafka_events"("organizationId");

-- CreateIndex
CREATE INDEX "kafka_events_organizationId_occurredAt_idx" ON "kafka_events"("organizationId", "occurredAt");
