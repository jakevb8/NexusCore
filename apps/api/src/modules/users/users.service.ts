import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common'
import { PrismaClient } from '@nexus-core/database'
import { Role } from '@nexus-core/shared'
import { addDays } from 'date-fns'

@Injectable()
export class UsersService {
  constructor(@Inject('PRISMA') private readonly db: PrismaClient) {}

  async findAll(organizationId: string) {
    return this.db.user.findMany({
      where: { organizationId },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async createInvite(email: string, role: Role, organizationId: string) {
    const existingUser = await this.db.user.findUnique({ where: { email } })
    if (existingUser) throw new ConflictException('User with this email already exists')

    const pendingInvite = await this.db.invite.findFirst({
      where: { email, organizationId, acceptedAt: null, expiresAt: { gt: new Date() } },
    })
    if (pendingInvite) throw new ConflictException('Active invite already exists for this email')

    return this.db.invite.create({
      data: {
        email,
        role,
        organizationId,
        expiresAt: addDays(new Date(), 7),
      },
    })
  }

  async listInvites(organizationId: string) {
    return this.db.invite.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    })
  }

  async deleteInvite(inviteId: string, organizationId: string) {
    const invite = await this.db.invite.findFirst({ where: { id: inviteId, organizationId } })
    if (!invite) throw new NotFoundException('Invite not found')
    if (invite.acceptedAt) throw new ForbiddenException('Cannot delete an already accepted invite')
    return this.db.invite.delete({ where: { id: inviteId } })
  }

  async updateRole(userId: string, role: Role, organizationId: string) {
    const user = await this.db.user.findFirst({ where: { id: userId, organizationId } })
    if (!user) throw new NotFoundException('User not found in this organization')
    if (role === Role.SUPERADMIN)
      throw new BadRequestException('Cannot assign SUPERADMIN via this endpoint')

    return this.db.user.update({ where: { id: userId }, data: { role } })
  }
}
