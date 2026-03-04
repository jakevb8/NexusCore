import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common'
import rateLimit from 'express-rate-limit'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'

const registerRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { statusCode: 429, message: 'Too many registration attempts. Please try again later.' },
})

@Module({
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(registerRateLimit)
      .forRoutes({ path: 'api/v1/auth/register', method: RequestMethod.POST })
  }
}
