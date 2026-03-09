import { Controller, Get, Query, Version } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { EventsService } from './events.service'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { User } from '@nexus-core/database'

@ApiTags('Events')
@ApiBearerAuth()
@Controller({ path: 'events', version: '1' })
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  @ApiOperation({ summary: 'List Kafka asset status change events for the organization' })
  findAll(
    @CurrentUser() user: User,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ) {
    return this.eventsService.findAll(
      user.organizationId,
      page ? parseInt(page) : 1,
      perPage ? parseInt(perPage) : 50,
    )
  }
}
