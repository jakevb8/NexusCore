import { Body, Controller, Get, Post, Req, UnauthorizedException } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { IsString, IsOptional, MinLength, Matches } from 'class-validator'
import { Request } from 'express'
import { AuthService, RegisterDto, AcceptInviteDto } from './auth.service'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Public } from '../../common/decorators/public.decorator'
import { User } from '@nexus-core/database'

class RegisterBody implements RegisterDto {
  @IsString()
  organizationName!: string

  @IsString()
  @MinLength(3)
  @Matches(/^[a-z0-9-]+$/, { message: 'Slug must be lowercase alphanumeric with hyphens' })
  organizationSlug!: string

  @IsOptional()
  @IsString()
  displayName?: string
}

class AcceptInviteBody implements AcceptInviteDto {
  @IsString()
  token!: string

  @IsOptional()
  @IsString()
  displayName?: string
}

@ApiTags('Auth')
@ApiBearerAuth()
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current authenticated user' })
  async getMe(@CurrentUser() user: User) {
    return this.authService.getMe(user.id)
  }

  @Post('register')
  @Public()
  @ApiOperation({ summary: 'Register a new organization (first user becomes ORG_MANAGER)' })
  async register(@Req() req: Request, @Body() body: RegisterBody) {
    const bearerToken = this.extractBearer(req)
    return this.authService.registerNewOrganization(bearerToken, body)
  }

  @Post('accept-invite')
  @Public()
  @ApiOperation({ summary: 'Accept an organization invite' })
  async acceptInvite(@Req() req: Request, @Body() body: AcceptInviteBody) {
    const bearerToken = this.extractBearer(req)
    return this.authService.acceptInvite(bearerToken, body)
  }

  private extractBearer(req: Request): string {
    const auth = req.headers.authorization
    if (!auth?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing authorization token')
    }
    return auth.slice(7)
  }
}
