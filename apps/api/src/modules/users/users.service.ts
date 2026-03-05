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
import { EmailService } from '../email/email.service'

@Injectable()
export class UsersService {
  constructor(
    @Inject('PRISMA') private readonly db: PrismaClient,
    private readonly emailService: EmailService,
  ) {}

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

  async createInvite(email: string, role: Role, organizationId: string, inviterId: string) {
    const existingUser = await this.db.user.findUnique({ where: { email } })
    if (existingUser) throw new ConflictException('User with this email already exists')

    const pendingInvite = await this.db.invite.findFirst({
      where: { email, organizationId, acceptedAt: null, expiresAt: { gt: new Date() } },
    })
    if (pendingInvite) throw new ConflictException('Active invite already exists for this email')

    // Fetch org name and inviter display name for the email
    const [org, inviter] = await Promise.all([
      this.db.organization.findUnique({ where: { id: organizationId }, select: { name: true } }),
      this.db.user.findUnique({
        where: { id: inviterId },
        select: { displayName: true, email: true },
      }),
    ])

    const invite = await this.db.invite.create({
      data: {
        email,
        role,
        organizationId,
        expiresAt: addDays(new Date(), 7),
      },
    })

    // Fire-and-forget — do not await so HTTP response is immediate
    void this.emailService.sendInviteEmail({
      toEmail: email,
      inviteToken: invite.token,
      organizationName: org?.name ?? 'your organization',
      inviterName: inviter?.displayName ?? inviter?.email ?? 'A team member',
    })

    return invite
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

  async removeMember(userId: string, actorId: string, organizationId: string) {
    if (userId === actorId) throw new BadRequestException('You cannot remove yourself')

    const user = await this.db.user.findFirst({ where: { id: userId, organizationId } })
    if (!user) throw new NotFoundException('User not found in this organization')
    if (user.role === Role.SUPERADMIN) throw new ForbiddenException('Cannot remove a SUPERADMIN')

    return this.db.user.delete({ where: { id: userId } })
  }
}
