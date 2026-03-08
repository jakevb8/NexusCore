export const KAFKA_TOPIC_ASSET_STATUS_CHANGED = 'nexus.asset.status-changed'

export interface AssetStatusChangedEvent {
  eventType: 'ASSET_STATUS_CHANGED'
  assetId: string
  organizationId: string
  actorId: string
  assetName: string
  previousStatus: string
  newStatus: string
  timestamp: string
}
