import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  Inject,
  Logger,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import * as admin from 'firebase-admin'
import { Request } from 'express'
import { prisma } from '@nexus-core/database'
import { IS_PUBLIC_KEY } from '../decorators/public.decorator'

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(FirebaseAuthGuard.name)

  constructor(
    @Inject('FIREBASE_ADMIN') private readonly firebaseApp: admin.app.App,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (isPublic) return true

    const request = context.switchToHttp().getRequest<Request>()
    const token = this.extractBearerToken(request)

    if (!token) {
      throw new UnauthorizedException('Missing authorization token')
    }

    try {
      const decoded = await this.firebaseApp.auth().verifyIdToken(token)

      // Lookup the user by UID first (fast path). If not found, fall back to
      // email and migrate the stored UID — supports cross-client identity
      // (e.g. same Google account on JS app, .NET app, and mobile).
      let user = await prisma.user.findUnique({
        where: { firebaseUid: decoded.uid },
        include: { organization: true },
      })

      if (!user && decoded.email) {
        const byEmail = await prisma.user.findUnique({
          where: { email: decoded.email },
        })
        if (byEmail) {
          // Migrate UID so subsequent requests hit the fast path.
          user = await prisma.user.update({
            where: { id: byEmail.id },
            data: { firebaseUid: decoded.uid },
            include: { organization: true },
          })
        }
      }

      if (!user) {
        throw new UnauthorizedException('User not found. Complete onboarding first.')
      }

      // Block access if the organization is awaiting approval or was rejected.
      // SUPERADMIN users bypass this check so they can manage orgs.
      if (user.role !== 'SUPERADMIN') {
        if (user.organization.status === 'PENDING') {
          throw new ForbiddenException(
            'Your organization is pending approval. You will receive access once an administrator reviews your registration.',
          )
        }
        if (user.organization.status === 'REJECTED') {
          throw new ForbiddenException(
            'Your organization registration was not approved. Please contact support.',
          )
        }
      }

      // Attach to request for downstream use
      ;(request as any).user = user
      return true
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err
      if (err instanceof ForbiddenException) throw err
      this.logger.error(`Token verification failed: ${(err as any)?.message ?? String(err)}`)
      throw new UnauthorizedException('Invalid or expired token')
    }
  }

  private extractBearerToken(req: Request): string | null {
    const auth = req.headers.authorization
    if (!auth?.startsWith('Bearer ')) return null
    return auth.slice(7)
  }
}
