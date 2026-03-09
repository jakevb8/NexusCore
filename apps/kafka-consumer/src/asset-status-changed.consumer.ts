import { Controller, Inject, Logger } from '@nestjs/common'
import { MessagePattern, Payload } from '@nestjs/microservices'
import { PrismaClient } from '@prisma/client'
import { KAFKA_TOPIC_ASSET_STATUS_CHANGED, AssetStatusChangedEvent } from './kafka.events'

@Controller()
export class AssetStatusChangedConsumer {
  private readonly logger = new Logger(AssetStatusChangedConsumer.name)

  constructor(@Inject('PRISMA') private readonly db: PrismaClient) {}

  @MessagePattern(KAFKA_TOPIC_ASSET_STATUS_CHANGED)
  async handle(@Payload() event: AssetStatusChangedEvent): Promise<void> {
    this.logger.log(
      `[${event.eventType}] asset=${event.assetId} org=${event.organizationId} ` +
        `${event.previousStatus} → ${event.newStatus} by actor=${event.actorId} at ${event.timestamp}`,
    )

    try {
      await this.db.kafkaEvent.create({
        data: {
          organizationId: event.organizationId,
          assetId: event.assetId,
          assetName: event.assetName,
          previousStatus: event.previousStatus,
          newStatus: event.newStatus,
          actorId: event.actorId,
          occurredAt: new Date(event.timestamp),
        },
      })
    } catch (err) {
      this.logger.error(`Failed to persist KafkaEvent for asset=${event.assetId}`, err)
    }
  }
}
