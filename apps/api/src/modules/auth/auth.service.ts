import {
  Injectable,
  ConflictException,
  NotFoundException,
  Inject,
  UnauthorizedException,
} from '@nestjs/common'
import { PrismaClient, User } from '@nexus-core/database'
import * as admin from 'firebase-admin'
import { AuditService } from '../audit/audit.service'

export interface RegisterDto {
  organizationName: string
  organizationSlug: string
  displayName?: string
}

export interface AcceptInviteDto {
  token: string
  displayName?: string
}

// Org creation limits removed — all new orgs are auto-approved on registration.

@Injectable()
export class AuthService {
  constructor(
    @Inject('PRISMA') private readonly db: PrismaClient,
    @Inject('FIREBASE_ADMIN') private readonly firebaseApp: admin.app.App,
    private readonly auditService: AuditService,
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
  /**
   * All new organizations are auto-approved on registration.
   */
  async shouldAutoApprove(): Promise<boolean> {
    return true
  }

  /**
   * Called after a user signs up via Firebase Auth.
   * Creates a new Organization and the first ORG_MANAGER user.
   * The org is always created as ACTIVE.
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

  /**
   * Delete the calling user's account:
   *   1. Delete the user row (AuditLog.actorId → SetNull via Prisma cascade).
   *   2. If they were the last member of their org, delete the org too
   *      (cascades assets, invites) and write an ORG_DELETED audit log.
   *   3. Delete the Firebase Auth record.
   */
  async deleteAccount(userId: string): Promise<void> {
    const user = await this.db.user.findUnique({ where: { id: userId } })
    if (!user) throw new NotFoundException('User not found')

    const remainingMembers = await this.db.user.count({
      where: { organizationId: user.organizationId },
    })

    if (remainingMembers === 1) {
      // Fetch org details before deletion for the audit log.
      const org = await this.db.organization.findUnique({ where: { id: user.organizationId } })

      // Write the audit log entry before the transaction so actorId is still valid.
      await this.auditService.log({
        action: 'ORG_DELETED',
        actorId: user.id,
        organizationId: user.organizationId,
        changes: {
          before: {
            organizationId: user.organizationId,
            organizationName: org?.name ?? null,
            actorEmail: user.email,
          },
          after: null,
        },
      })
    }

    await this.db.$transaction(async (tx) => {
      await tx.user.delete({ where: { id: userId } })

      if (remainingMembers === 1) {
        // This user was the last member — wipe the org and all its data.
        await tx.organization.delete({ where: { id: user.organizationId } })
      }
    })

    // Remove Firebase Auth record — best-effort; do not let a Firebase failure
    // roll back the DB deletion that already committed.
    try {
      await this.firebaseApp.auth().deleteUser(user.firebaseUid)
    } catch (err) {
      console.error('[deleteAccount] Failed to delete Firebase user', user.firebaseUid, err)
    }
  }
}
