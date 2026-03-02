import { Injectable, Inject, NotFoundException } from '@nestjs/common'
import { PrismaClient } from '@nexus-core/database'

@Injectable()
export class OrganizationsService {
  constructor(@Inject('PRISMA') private readonly db: PrismaClient) {}

  async findOne(id: string) {
    const org = await this.db.organization.findUnique({
      where: { id },
      include: { _count: { select: { users: true, assets: true } } },
    })
    if (!org) throw new NotFoundException('Organization not found')
    return org
  }

  async findAll() {
    return this.db.organization.findMany({
      include: { _count: { select: { users: true, assets: true } } },
      orderBy: { createdAt: 'desc' },
    })
  }
}
