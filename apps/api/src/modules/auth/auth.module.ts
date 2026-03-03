import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import rateLimit from 'express-rate-limit'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'

const registerRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { statusCode: 429, message: 'Too many registration attempts. Please try again later.' },
})

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    // Apply globally via APP_GUARD so every route is protected by default
    { provide: APP_GUARD, useClass: FirebaseAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [AuthService],
})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(registerRateLimit)
      .forRoutes({ path: 'api/v1/auth/register', method: RequestMethod.POST })
  }
}
