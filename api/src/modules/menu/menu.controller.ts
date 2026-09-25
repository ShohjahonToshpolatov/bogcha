import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { CopyWeekDto, UpsertMenuDayDto } from './dto/upsert-menu-day.dto';
import { MenuService } from './menu.service';

@ApiTags('menu')
@ApiBearerAuth()
@Controller('menu')
export class MenuController {
  constructor(private readonly menu: MenuService) {}

  @Get()
  findAll(@Query('branchId') branchId: string, @Query('from') from: string, @Query('to') to: string) {
    return this.menu.findAll(branchId, from, to);
  }

  @Roles(Role.OWNER, Role.ADMIN, Role.COOK)
  @Post()
  upsert(@Body() dto: UpsertMenuDayDto) {
    return this.menu.upsert(dto);
  }

  @Roles(Role.OWNER, Role.ADMIN, Role.COOK)
  @Post('copy-week')
  copyWeek(@Body() dto: CopyWeekDto) {
    return this.menu.copyWeek(dto);
  }

  @Roles(Role.OWNER, Role.ADMIN, Role.COOK)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.menu.remove(id);
  }
}
