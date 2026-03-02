import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import { User } from '@nexus-core/database'

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): User & { organization: { id: string; name: string; slug: string } } => {
    const request = ctx.switchToHttp().getRequest()
    return request.user
  },
)
