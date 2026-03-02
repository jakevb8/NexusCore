import { Body, Controller, Get, Post, Version } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { IsString, IsOptional, MinLength, Matches } from 'class-validator'
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
  @ApiOperation({ summary: 'Register a new organization (first user becomes ORG_MANAGER)' })
  async register(@CurrentUser() user: User & { email: string; firebaseUid: string }, @Body() body: RegisterBody) {
    return this.authService.registerNewOrganization(user.firebaseUid, user.email, body)
  }

  @Post('accept-invite')
  @ApiOperation({ summary: 'Accept an organization invite' })
  async acceptInvite(@CurrentUser() user: User & { email: string; firebaseUid: string }, @Body() body: AcceptInviteBody) {
    return this.authService.acceptInvite(user.firebaseUid, user.email, body)
  }
}
