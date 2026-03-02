import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { FirebaseModule } from './firebase/firebase.module'
import { PrismaModule } from './common/prisma.module'
import { AuthModule } from './modules/auth/auth.module'
import { OrganizationsModule } from './modules/organizations/organizations.module'
import { UsersModule } from './modules/users/users.module'
import { AssetsModule } from './modules/assets/assets.module'
import { AuditModule } from './modules/audit/audit.module'
import { ReportsModule } from './modules/reports/reports.module'

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
  ],
})
export class AppModule {}
