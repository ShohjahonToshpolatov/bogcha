import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { InviteStaffDto } from './dto/invite-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { StaffService } from './staff.service';

@ApiTags('staff')
@ApiBearerAuth()
@Controller('staff')
export class StaffController {
  constructor(private readonly staff: StaffService) {}

  @Roles(Role.OWNER, Role.ADMIN)
  @Get()
  findAll() {
    return this.staff.findAll();
  }

  @Roles(Role.OWNER, Role.ADMIN)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.staff.findOne(id);
  }

  @Roles(Role.OWNER, Role.ADMIN)
  @Post('invite')
  invite(@Body() dto: InviteStaffDto) {
    return this.staff.invite(dto);
  }

  @Roles(Role.OWNER, Role.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateStaffDto) {
    return this.staff.update(id, dto);
  }

  @Roles(Role.OWNER, Role.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.staff.remove(id);
  }

  @Roles(Role.OWNER, Role.ADMIN)
  @Get(':id/attendance')
  attendance(@Param('id') id: string, @Query('month') month: string) {
    return this.staff.attendanceForMonth(id, month);
  }

  @Post('attendance/check-in')
  checkIn(@CurrentUser('userId') userId: string) {
    return this.staff.checkIn(userId);
  }

  @Post('attendance/check-out')
  checkOut(@CurrentUser('userId') userId: string) {
    return this.staff.checkOut(userId);
  }
}
