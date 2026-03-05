import {
  Injectable,
  ConflictException,
  NotFoundException,
  Inject,
  UnauthorizedException,
} from '@nestjs/common'
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

/** Auto-approve up to this many new orgs per calendar day (UTC). */
const AUTO_APPROVE_DAILY_LIMIT = 5

/**
 * Once the total number of ACTIVE orgs reaches this threshold,
 * stop auto-approving and require manual SUPERADMIN review.
 */
const AUTO_APPROVE_TOTAL_LIMIT = 50

@Injectable()
export class AuthService {
  constructor(
    @Inject('PRISMA') private readonly db: PrismaClient,
    @Inject('FIREBASE_ADMIN') private readonly firebaseApp: admin.app.App,
  ) {}

  /**
   * Verify a raw Firebase ID token and return { uid, email }.
   * Used by public endpoints (register, accept-invite) that can't rely on
   * FirebaseAuthGuard because the user has no DB record yet.
   */
  private async verifyToken(bearerToken: string): Promise<{ uid: string; email: string }> {
    try {
      const decoded = await this.firebaseApp.auth().verifyIdToken(bearerToken)
      const email = decoded.email
      if (!email) throw new UnauthorizedException('Firebase token has no email claim')
      return { uid: decoded.uid, email }
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err
      throw new UnauthorizedException('Invalid or expired Firebase token')
    }
  }

  /**
   * Look up a user by Firebase UID. If not found, fall back to email lookup and
   * migrate the stored UID to the new one — transparent cross-client identity.
   * Use this wherever you have both uid and email (i.e. after verifying a token).
   */
  async getOrMigrateUser(firebaseUid: string, email: string): Promise<User | null> {
    // Fast path: UID already matches.
    const byUid = await this.db.user.findUnique({
      where: { firebaseUid },
      include: { organization: true },
    })
    if (byUid) return byUid

    // Fallback: find by email (user registered via a different Firebase project / client).
    const byEmail = await this.db.user.findUnique({
      where: { email },
      include: { organization: true },
    })
    if (!byEmail) return null

    // Migrate the stored UID so future logins hit the fast path.
    return this.db.user.update({
      where: { id: byEmail.id },
      data: { firebaseUid },
      include: { organization: true },
    })
  }

  /**
   * Determine whether the next registering org should be auto-approved.
   *
   * Rules (evaluated in order):
   *   1. If total ACTIVE orgs >= AUTO_APPROVE_TOTAL_LIMIT → manual approval required.
   *   2. If orgs auto-approved today (UTC) >= AUTO_APPROVE_DAILY_LIMIT → manual approval required.
   *   3. Otherwise → auto-approve.
   */
  async shouldAutoApprove(): Promise<boolean> {
    const todayUtc = new Date()
    todayUtc.setUTCHours(0, 0, 0, 0)

    const [totalActive, approvedToday] = await Promise.all([
      this.db.organization.count({ where: { status: 'ACTIVE' } }),
      this.db.organization.count({
        where: { status: 'ACTIVE', updatedAt: { gte: todayUtc } },
      }),
    ])

    if (totalActive >= AUTO_APPROVE_TOTAL_LIMIT) return false
    if (approvedToday >= AUTO_APPROVE_DAILY_LIMIT) return false
    return true
  }

  /**
   * Called after a user signs up via Firebase Auth.
   * Creates a new Organization and the first ORG_MANAGER user.
   * The org is auto-approved if within daily/total limits; otherwise stays PENDING.
   */
  async registerNewOrganization(bearerToken: string, dto: RegisterDto): Promise<User> {
    const { uid: firebaseUid, email } = await this.verifyToken(bearerToken)

    // Block if this email already has a user record (cross-client identity check).
    const existingUser = await this.db.user.findUnique({ where: { email } })
    if (existingUser) throw new ConflictException('User already registered')

    const existingOrg = await this.db.organization.findUnique({
      where: { slug: dto.organizationSlug },
    })
    if (existingOrg) throw new ConflictException('Organization slug already taken')

    const autoApprove = await this.shouldAutoApprove()

    return this.db.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: dto.organizationName,
          slug: dto.organizationSlug,
          status: autoApprove ? 'ACTIVE' : 'PENDING',
        },
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
  async acceptInvite(bearerToken: string, dto: AcceptInviteDto): Promise<User> {
    const { uid: firebaseUid, email } = await this.verifyToken(bearerToken)

    const invite = await this.db.invite.findUnique({ where: { token: dto.token } })

    if (!invite) throw new NotFoundException('Invite not found')
    if (invite.acceptedAt) throw new ConflictException('Invite already used')
    if (invite.expiresAt < new Date()) throw new ConflictException('Invite has expired')
    if (invite.email !== email) throw new ConflictException('Invite email mismatch')

    // Block if this email already has a user record (cross-client identity check).
    const existingUser = await this.db.user.findUnique({ where: { email } })
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

  async getMe(
    userId: string,
  ): Promise<User & { organization: { id: string; name: string; slug: string } }> {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      include: { organization: true },
    })
    if (!user) throw new NotFoundException('User not found')
    return user as any
  }
}
