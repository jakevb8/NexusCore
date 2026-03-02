import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import * as admin from 'firebase-admin'
import { Request } from 'express'
import { prisma } from '@nexus-core/database'
import { IS_PUBLIC_KEY } from '../decorators/public.decorator'

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
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

      // Lookup the user in our DB to get role + organizationId
      const user = await prisma.user.findUnique({
        where: { firebaseUid: decoded.uid },
        include: { organization: true },
      })

      if (!user) {
        throw new UnauthorizedException('User not found. Complete onboarding first.')
      }

      // Attach to request for downstream use
      ;(request as any).user = user
      return true
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err
      throw new UnauthorizedException('Invalid or expired token')
    }
  }

  private extractBearerToken(req: Request): string | null {
    const auth = req.headers.authorization
    if (!auth?.startsWith('Bearer ')) return null
    return auth.slice(7)
  }
}
