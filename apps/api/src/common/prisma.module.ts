import { Module, Global } from '@nestjs/common'
import { prisma } from '@nexus-core/database'

/**
 * Makes the PrismaClient available globally so modules don't need to import it individually.
 */
@Global()
@Module({
  providers: [
    {
      provide: 'PRISMA',
      useValue: prisma,
    },
  ],
  exports: ['PRISMA'],
})
export class PrismaModule {}
