import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Role } from '@nexus-core/shared'
import { ROLES_KEY } from '../decorators/roles.decorator'
import { ROLE_HIERARCHY } from '@nexus-core/shared'

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    if (!required || required.length === 0) return true

    const { user } = context.switchToHttp().getRequest()
    if (!user) throw new ForbiddenException('Not authenticated')

    const userRank = ROLE_HIERARCHY[user.role as Role]
    const hasAccess = required.some((r) => userRank >= ROLE_HIERARCHY[r])

    if (!hasAccess) {
      throw new ForbiddenException(
        `Requires one of: [${required.join(', ')}]. Your role: ${user.role}`,
      )
    }

    return true
  }
}
