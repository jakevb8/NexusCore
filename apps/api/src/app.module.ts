import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_GUARD } from '@nestjs/core'
import { FirebaseModule } from './firebase/firebase.module'
import { PrismaModule } from './common/prisma.module'
import { AuthModule } from './modules/auth/auth.module'
import { OrganizationsModule } from './modules/organizations/organizations.module'
import { UsersModule } from './modules/users/users.module'
import { AssetsModule } from './modules/assets/assets.module'
import { AuditModule } from './modules/audit/audit.module'
import { ReportsModule } from './modules/reports/reports.module'
import { EventsModule } from './modules/events/events.module'
import { KafkaProducerModule } from './modules/kafka/kafka-producer.module'
import { FirebaseAuthGuard } from './common/guards/firebase-auth.guard'
import { RolesGuard } from './common/guards/roles.guard'

// Kafka is feature-flagged. Set KAFKA_ENABLED=true in Railway to re-enable the
// broker pipeline (publishes to kafka-consumer service). Default is disabled —
// asset status events are written directly to the DB instead, saving ~650 MB RAM.
const kafkaEnabled = process.env.KAFKA_ENABLED === 'true'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    FirebaseModule,
    PrismaModule,
    AuthModule,
    OrganizationsModule,
    UsersModule,
    AssetsModule,
    AuditModule,
    ReportsModule,
    EventsModule,
    // KafkaProducerModule is always registered so AssetsService can inject
    // KafkaProducerService. The service itself is a no-op when KAFKA_ENABLED is
    // false (no broker connection is attempted without KAFKA_BROKERS set).
    KafkaProducerModule,
  ],
  providers: [
    // Registering guards at the root module ensures the Reflector used by
    // FirebaseAuthGuard has full metadata context, so @Public() is respected.
    { provide: APP_GUARD, useClass: FirebaseAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {
  constructor() {
    if (!kafkaEnabled) {
      // Remind operators that Kafka is off so they don't wonder why events
      // aren't flowing through the broker.
      const { Logger } = require('@nestjs/common')
      new Logger('AppModule').log(
        'Kafka is DISABLED (KAFKA_ENABLED != true) — asset status events written directly to DB',
      )
    }
  }
}
