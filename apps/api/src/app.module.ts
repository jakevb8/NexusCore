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
import { FirebaseAuthGuard } from './common/guards/firebase-auth.guard'
import { RolesGuard } from './common/guards/roles.guard'

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
  providers: [
    // Registering guards at the root module ensures the Reflector used by
    // FirebaseAuthGuard has full metadata context, so @Public() is respected.
    { provide: APP_GUARD, useClass: FirebaseAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
