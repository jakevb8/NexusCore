import { Module } from '@nestjs/common'
import { AssetStatusChangedConsumer } from './asset-status-changed.consumer'

@Module({
  controllers: [AssetStatusChangedConsumer],
})
export class AppModule {}
