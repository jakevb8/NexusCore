import { NestFactory } from '@nestjs/core'
import { ValidationPipe, VersioningType } from '@nestjs/common'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import { AppModule } from './app.module'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import express, { Request, Response } from 'express'
import * as http from 'http'

async function bootstrap() {
  const port = process.env.PORT ?? 3001

  // ─── Pre-boot Express server ───────────────────────────────────────────────
  // Start a minimal HTTP server immediately so Railway's healthcheck never
  // times out waiting for NestJS to fully initialise (Firebase Admin + Prisma
  // can add several seconds to startup on a cold container).
  const preBootApp = express()
  preBootApp.get('/api/health', (_req: Request, res: Response) => res.json({ status: 'starting' }))
  const preBootServer = http.createServer(preBootApp)
  await new Promise<void>((resolve) => preBootServer.listen(port, () => resolve()))
  console.log(`[pre-boot] HTTP server listening on port ${port}`)

  // ─── NestJS bootstrap ─────────────────────────────────────────────────────
  const app = await NestFactory.create(AppModule, { logger: ['log', 'warn', 'error'] })

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

  // ─── Health check ─────────────────────────────────────────────────────────
  const httpAdapter = app.getHttpAdapter()
  httpAdapter.get('/api/health', (_req: any, res: any) => res.json({ status: 'ok' }))

  // Hand the already-bound port to NestJS by closing the pre-boot server first,
  // then letting Nest bind to the same port.
  await new Promise<void>((resolve, reject) =>
    preBootServer.close((err) => (err ? reject(err) : resolve())),
  )

  await app.listen(port)
  console.log(`Nexus-Core API running on http://localhost:${port}/api`)
  console.log(`Swagger docs at http://localhost:${port}/api/docs`)
}

bootstrap().catch((err) => {
  console.error('Fatal bootstrap error:', err)
  process.exit(1)
})
