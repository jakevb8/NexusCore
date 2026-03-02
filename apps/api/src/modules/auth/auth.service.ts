import { Injectable, ConflictException, NotFoundException, Inject } from '@nestjs/common'
import { PrismaClient, User } from '@nexus-core/database'
import * as admin from 'firebase-admin'

export interface RegisterDto {
  organizationName: string
  organizationSlug: string
  displayName?: string
}

export interface AcceptInviteDto {
  token: string
  displayName?: string
}

@Injectable()
export class AuthService {
  constructor(
    @Inject('PRISMA') private readonly db: PrismaClient,
    @Inject('FIREBASE_ADMIN') private readonly firebaseApp: admin.app.App,
  ) {}

  /**
   * Called after a user signs up via Firebase Auth.
   * Creates a new Organization and the first ORG_MANAGER user.
   */
  async registerNewOrganization(
    firebaseUid: string,
    email: string,
    dto: RegisterDto,
  ): Promise<User> {
    const existingUser = await this.db.user.findUnique({ where: { firebaseUid } })
    if (existingUser) throw new ConflictException('User already registered')

    const existingOrg = await this.db.organization.findUnique({
      where: { slug: dto.organizationSlug },
    })
    if (existingOrg) throw new ConflictException('Organization slug already taken')

    return this.db.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: { name: dto.organizationName, slug: dto.organizationSlug },
      })

      return tx.user.create({
        data: {
          firebaseUid,
          email,
          displayName: dto.displayName ?? null,
          role: 'ORG_MANAGER',
          organizationId: org.id,
        },
      })
    })
  }

  /**
   * Accept an invite token — creates a user in an existing org.
   */
  async acceptInvite(
    firebaseUid: string,
    email: string,
    dto: AcceptInviteDto,
  ): Promise<User> {
    const invite = await this.db.invite.findUnique({ where: { token: dto.token } })

    if (!invite) throw new NotFoundException('Invite not found')
    if (invite.acceptedAt) throw new ConflictException('Invite already used')
    if (invite.expiresAt < new Date()) throw new ConflictException('Invite has expired')
    if (invite.email !== email) throw new ConflictException('Invite email mismatch')

    const existingUser = await this.db.user.findUnique({ where: { firebaseUid } })
    if (existingUser) throw new ConflictException('User already registered')

    return this.db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          firebaseUid,
          email,
          displayName: dto.displayName ?? null,
          role: invite.role,
          organizationId: invite.organizationId,
        },
      })

      await tx.invite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
      })

      return user
    })
  }

  async getMe(userId: string): Promise<User & { organization: { id: string; name: string; slug: string } }> {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      include: { organization: true },
    })
    if (!user) throw new NotFoundException('User not found')
    return user as any
  }
}
