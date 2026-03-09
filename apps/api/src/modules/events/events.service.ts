import { Injectable, Inject } from '@nestjs/common'
import { PrismaClient } from '@nexus-core/database'

@Injectable()
export class EventsService {
  constructor(@Inject('PRISMA') private readonly db: PrismaClient) {}

  async findAll(organizationId: string, page = 1, perPage = 50) {
    const skip = (page - 1) * perPage

    const [data, total] = await Promise.all([
      this.db.kafkaEvent.findMany({
        where: { organizationId },
        orderBy: { occurredAt: 'desc' },
        skip,
        take: perPage,
      }),
      this.db.kafkaEvent.count({ where: { organizationId } }),
    ])

    return { data, meta: { total, page, perPage } }
  }
}
