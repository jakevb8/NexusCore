import { NestFactory } from '@nestjs/core'
import { ValidationPipe, VersioningType } from '@nestjs/common'
import { ExpressAdapter } from '@nestjs/platform-express'
import { AppModule } from '../src/app.module'
import { onRequest } from 'firebase-functions/v2/https'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import * as express from 'express'

const server = express.default()

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server), {
    logger: ['error', 'warn', 'log'],
  })

  // ─── CORS (must be before helmet) ─────────────────────────────────────────
  const allowedOrigins = [
    'http://localhost:3000',
    'https://nexus-core-rms.web.app',
    'https://nexus-core-rms.firebaseapp.com',
    ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
  ]
  app.enableCors({
    origin: (origin, callback) => {
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
      windowMs: 15 * 60 * 1000,
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

  await app.init()
}

const ready = bootstrap()

export const api = onRequest(
  {
    region: 'us-central1',
    memory: '512MiB',
    timeoutSeconds: 60,
    minInstances: 0,
  },
  async (req, res) => {
    await ready
    server(req as any, res as any)
  },
)
