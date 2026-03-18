import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common'
import { Kafka, Producer, Partitioners } from 'kafkajs'

@Injectable()
export class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaProducerService.name)
  private producer: Producer | null = null
  private connected = false

  async onModuleInit() {
    const brokers = process.env.KAFKA_BROKERS
    if (!brokers) {
      this.logger.warn('KAFKA_BROKERS not set — Kafka producer disabled')
      return
    }

    const kafka = new Kafka({
      clientId: 'nexuscore-api',
      brokers: brokers.split(','),
      ssl: process.env.KAFKA_SSL === 'true',
      sasl:
        process.env.KAFKA_SASL_USERNAME && process.env.KAFKA_SASL_PASSWORD
          ? {
              mechanism: 'plain',
              username: process.env.KAFKA_SASL_USERNAME,
              password: process.env.KAFKA_SASL_PASSWORD,
            }
          : undefined,
    })

    this.producer = kafka.producer({
      createPartitioner: Partitioners.LegacyPartitioner,
    })

    try {
      await this.producer.connect()
      this.connected = true
      this.logger.log(`Kafka producer connected to ${brokers}`)
    } catch (err) {
      this.logger.error('Kafka producer failed to connect — events will be dropped', err)
      this.producer = null
    }
  }

  async onModuleDestroy() {
    if (this.producer && this.connected) {
      await this.producer.disconnect()
    }
  }

  async publish(topic: string, key: string, value: object): Promise<void> {
    if (!this.producer || !this.connected) {
      this.logger.debug(`Kafka unavailable — dropping event on topic ${topic}`)
      return
    }
    try {
      await this.producer.send({
        topic,
        messages: [{ key, value: JSON.stringify(value) }],
      })
    } catch (err) {
      // Never let Kafka failures propagate to the caller — events are best-effort
      this.logger.error(`Failed to publish to ${topic}`, err)
    }
  }
}
