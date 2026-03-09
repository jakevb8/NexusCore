import { Module } from '@nestjs/common'
import { AssetStatusChangedConsumer } from './asset-status-changed.consumer'
import { PrismaClient } from '@prisma/client'

@Module({
  controllers: [AssetStatusChangedConsumer],
  providers: [
    {
      provide: 'PRISMA',
      useFactory: () => {
        const client = new PrismaClient()
        client.$connect()
        return client
      },
    },
  ],
})
export class AppModule {}
