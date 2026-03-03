import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common'
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

  async findPending() {
    return this.db.organization.findMany({
      where: { status: 'PENDING' },
      include: {
        _count: { select: { users: true } },
        users: {
          where: { role: 'ORG_MANAGER' },
          select: { email: true, displayName: true, createdAt: true },
          take: 1,
        },
      },
      orderBy: { createdAt: 'asc' },
    })
  }

  async approve(id: string) {
    const org = await this.db.organization.findUnique({ where: { id } })
    if (!org) throw new NotFoundException('Organization not found')
    if (org.status === 'ACTIVE') throw new BadRequestException('Organization is already active')

    return this.db.organization.update({
      where: { id },
      data: { status: 'ACTIVE' },
    })
  }

  async reject(id: string) {
    const org = await this.db.organization.findUnique({ where: { id } })
    if (!org) throw new NotFoundException('Organization not found')
    if (org.status === 'REJECTED') throw new BadRequestException('Organization is already rejected')

    return this.db.organization.update({
      where: { id },
      data: { status: 'REJECTED' },
    })
  }
}
