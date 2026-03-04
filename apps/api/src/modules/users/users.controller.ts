import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  Version,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { IsEmail, IsEnum } from 'class-validator'
import { UsersService } from './users.service'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Roles } from '../../common/decorators/roles.decorator'
import { Role } from '@nexus-core/shared'
import { User } from '@nexus-core/database'

class InviteUserBody {
  @IsEmail() email!: string
  @IsEnum(Role) role!: Role
}

class UpdateRoleBody {
  @IsEnum(Role) role!: Role
}

@ApiTags('Users')
@ApiBearerAuth()
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(Role.ORG_MANAGER)
  @ApiOperation({ summary: 'List all users in the organization' })
  findAll(@CurrentUser() user: User) {
    return this.usersService.findAll(user.organizationId)
  }

  @Post('invite')
  @Roles(Role.ORG_MANAGER)
  @ApiOperation({ summary: 'Invite a user to the organization' })
  invite(@Body() body: InviteUserBody, @CurrentUser() user: User) {
    return this.usersService.createInvite(body.email, body.role, user.organizationId)
  }

  @Get('invites')
  @Roles(Role.ORG_MANAGER)
  @ApiOperation({ summary: 'List pending invites' })
  listInvites(@CurrentUser() user: User) {
    return this.usersService.listInvites(user.organizationId)
  }

  @Delete('invites/:id')
  @Roles(Role.ORG_MANAGER)
  @ApiOperation({ summary: 'Delete a pending invite' })
  deleteInvite(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.usersService.deleteInvite(id, user.organizationId)
  }

  @Patch(':id/role')
  @Roles(Role.ORG_MANAGER)
  @ApiOperation({ summary: "Update a user's role" })
  updateRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateRoleBody,
    @CurrentUser() user: User,
  ) {
    return this.usersService.updateRole(id, body.role, user.organizationId)
  }
}
