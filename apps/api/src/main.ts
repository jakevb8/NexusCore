import { NestFactory } from '@nestjs/core'
import { ValidationPipe, VersioningType } from '@nestjs/common'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import { AppModule } from './app.module'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  // ─── CORS (must be before helmet) ─────────────────────────────────────────
  const allowedOrigins = [
    'http://localhost:3000',
    'https://nexus-core-rms.web.app',
    'https://nexus-core-rms.firebaseapp.com',
    ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
  ]
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. curl, Postman, server-to-server)
      if (!origin) return callback(null, true)
      if (allowedOrigins.includes(origin)) return callback(null, true)
      callback(new Error(`CORS: origin '${origin}' not allowed`))
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })

  // ─── Security ─────────────────────────────────────────────────────────────
  app.use(helmet())
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 300,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  )

  // ─── Validation ───────────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )

  // ─── Versioning ───────────────────────────────────────────────────────────
  app.enableVersioning({ type: VersioningType.URI })
  app.setGlobalPrefix('api')

  // ─── Swagger ──────────────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Nexus-Core API')
      .setDescription('Multi-tenant Resource Management System')
      .setVersion('1.0')
      .addBearerAuth()
      .build()
    const document = SwaggerModule.createDocument(app, config)
    SwaggerModule.setup('api/docs', app, document)
  }

  // ─── Health check (used by Railway) ──────────────────────────────────────
  const httpAdapter = app.getHttpAdapter()
  httpAdapter.get('/api/health', (_req: any, res: any) => res.json({ status: 'ok' }))

  const port = process.env.PORT ?? 3001
  await app.listen(port)
  console.log(`Nexus-Core API running on http://localhost:${port}/api`)
  console.log(`Swagger docs at http://localhost:${port}/api/docs`)
}

bootstrap()
