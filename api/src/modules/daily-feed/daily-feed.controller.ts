import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user.interface';
import { CreatePostDto } from './dto/create-post.dto';
import { QueryFeedDto } from './dto/query-feed.dto';
import { DailyFeedService } from './daily-feed.service';

@ApiTags('daily-feed')
@ApiBearerAuth()
@Controller('feed')
export class DailyFeedController {
  constructor(private readonly feed: DailyFeedService) {}

  @Get()
  findAll(@Query() query: QueryFeedDto, @CurrentUser() user: AuthenticatedUser) {
    return this.feed.findAll(query, user);
  }

  @Roles(Role.OWNER, Role.ADMIN, Role.TEACHER)
  @Post()
  create(@Body() dto: CreatePostDto, @CurrentUser('userId') authorId: string) {
    return this.feed.create(dto, authorId);
  }

  @Roles(Role.OWNER, Role.ADMIN, Role.TEACHER)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreatePostDto>) {
    return this.feed.update(id, dto);
  }

  @Roles(Role.OWNER, Role.ADMIN, Role.TEACHER)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.feed.remove(id);
  }
}
