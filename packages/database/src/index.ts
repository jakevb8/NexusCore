import { PrismaClient } from '@prisma/client'
import { PrismaNeonHttp } from '@prisma/adapter-neon'

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL ?? ''
  const adapter = new PrismaNeonHttp(connectionString, {})
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })
}

// Prevent multiple PrismaClient instances during hot-reload in development.
// Use a lazy getter so the client (and Neon connection) is not initialised
// until the first actual usage — avoids errors in test environments where
// DATABASE_URL is not set.
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    if (!globalForPrisma.prisma) {
      globalForPrisma.prisma = createPrismaClient()
    }
    const value = (globalForPrisma.prisma as any)[prop]
    return typeof value === 'function' ? value.bind(globalForPrisma.prisma) : value
  },
})

export * from '@prisma/client'
