import { Controller, Logger } from '@nestjs/common'
import { MessagePattern, Payload } from '@nestjs/microservices'
import { KAFKA_TOPIC_ASSET_STATUS_CHANGED, AssetStatusChangedEvent } from './kafka.events'

@Controller()
export class AssetStatusChangedConsumer {
  private readonly logger = new Logger(AssetStatusChangedConsumer.name)

  @MessagePattern(KAFKA_TOPIC_ASSET_STATUS_CHANGED)
  handle(@Payload() event: AssetStatusChangedEvent): void {
    this.logger.log(
      `[${event.eventType}] asset=${event.assetId} org=${event.organizationId} ` +
        `${event.previousStatus} → ${event.newStatus} by actor=${event.actorId} at ${event.timestamp}`,
    )
  }
}
