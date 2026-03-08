export const KAFKA_TOPIC_ASSET_STATUS_CHANGED = 'nexus.asset.status-changed'

export interface AssetStatusChangedEvent {
  eventType: 'ASSET_STATUS_CHANGED'
  assetId: string
  organizationId: string
  actorId: string
  assetName: string
  /** String representation of the status — Kafka payloads are JSON so using string avoids
   *  nominal-type conflicts between Prisma's and @nexus-core/shared's AssetStatus enums. */
  previousStatus: string
  newStatus: string
  timestamp: string
}
