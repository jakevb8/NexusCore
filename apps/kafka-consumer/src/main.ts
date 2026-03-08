import { NestFactory } from '@nestjs/core'
import { MicroserviceOptions, Transport } from '@nestjs/microservices'
import { AppModule } from './app.module'

async function bootstrap() {
  const brokers = (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(',')

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: 'nexuscore-consumer',
        brokers,
        ssl: process.env.KAFKA_SSL === 'true',
        sasl:
          process.env.KAFKA_SASL_USERNAME && process.env.KAFKA_SASL_PASSWORD
            ? {
                mechanism: 'plain',
                username: process.env.KAFKA_SASL_USERNAME!,
                password: process.env.KAFKA_SASL_PASSWORD!,
              }
            : undefined,
      },
      consumer: {
        groupId: 'nexuscore-consumer-group',
      },
    },
  })

  await app.listen()
  console.log('Nexus-Core Kafka consumer is listening')
}

bootstrap().catch((err) => {
  console.error('Fatal bootstrap error:', err)
  process.exit(1)
})
