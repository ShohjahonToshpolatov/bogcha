import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user.interface';
import { AnnouncementsService } from './announcements.service';
import { UpsertAnnouncementDto } from './dto/upsert-announcement.dto';

@ApiTags('announcements')
@ApiBearerAuth()
@Controller('announcements')
export class AnnouncementsController {
  constructor(private readonly announcements: AnnouncementsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.announcements.findAll(user);
  }

  @Roles(Role.OWNER, Role.ADMIN, Role.TEACHER)
  @Post()
  create(@Body() dto: UpsertAnnouncementDto, @CurrentUser('userId') authorId: string) {
    return this.announcements.create(dto, authorId);
  }

  @Roles(Role.OWNER, Role.ADMIN, Role.TEACHER)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<UpsertAnnouncementDto>) {
    return this.announcements.update(id, dto);
  }

  @Roles(Role.OWNER, Role.ADMIN, Role.TEACHER)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.announcements.remove(id);
  }

  @Post(':id/read')
  markRead(@Param('id') id: string, @CurrentUser('userId') userId: string) {
    return this.announcements.markRead(id, userId);
  }

  @Roles(Role.OWNER, Role.ADMIN)
  @Get(':id/read-stats')
  readStats(@Param('id') id: string) {
    return this.announcements.readStats(id);
  }
}
