import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role, WaitlistStatus } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { UpsertWaitlistDto } from './dto/upsert-waitlist.dto';
import { WaitlistService } from './waitlist.service';

@ApiTags('waitlist')
@ApiBearerAuth()
@Roles(Role.OWNER, Role.ADMIN)
@Controller('waitlist')
export class WaitlistController {
  constructor(private readonly waitlist: WaitlistService) {}

  @Get()
  findAll(@Query('status') status?: WaitlistStatus) {
    return this.waitlist.findAll(status);
  }

  @Post()
  create(@Body() dto: UpsertWaitlistDto) {
    return this.waitlist.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<UpsertWaitlistDto>) {
    return this.waitlist.update(id, dto);
  }

  @Post(':id/convert')
  convert(@Param('id') id: string) {
    return this.waitlist.convert(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.waitlist.remove(id);
  }
}
