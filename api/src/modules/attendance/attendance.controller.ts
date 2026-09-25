import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user.interface';
import { AttendanceService } from './attendance.service';
import { BulkAttendanceDto } from './dto/bulk-attendance.dto';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';

@ApiTags('attendance')
@ApiBearerAuth()
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService) {}

  @Get()
  daily(@Query('groupId') groupId: string, @Query('date') date: string, @CurrentUser() user: AuthenticatedUser) {
    return this.attendance.dailyByGroup(groupId, date, user);
  }

  @Roles(Role.OWNER, Role.ADMIN, Role.TEACHER)
  @Post('check-in')
  checkIn(@Body() dto: CheckInDto, @CurrentUser() user: AuthenticatedUser) {
    return this.attendance.checkIn(dto, user);
  }

  @Roles(Role.OWNER, Role.ADMIN, Role.TEACHER)
  @Post('check-out')
  checkOut(@Body() dto: CheckOutDto, @CurrentUser() user: AuthenticatedUser) {
    return this.attendance.checkOut(dto, user);
  }

  @Roles(Role.OWNER, Role.ADMIN, Role.TEACHER)
  @Post('mark')
  mark(@Body() dto: MarkAttendanceDto, @CurrentUser() user: AuthenticatedUser) {
    return this.attendance.mark(dto, user);
  }

  @Roles(Role.OWNER, Role.ADMIN, Role.TEACHER)
  @Post('bulk')
  bulk(@Body() dto: BulkAttendanceDto, @CurrentUser() user: AuthenticatedUser) {
    return this.attendance.bulk(dto, user);
  }

  @Get('summary')
  summary(
    @Query('groupId') groupId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.attendance.summary(groupId, from, to, user);
  }

  @Get('child/:childId/calendar')
  childCalendar(
    @Param('childId') childId: string,
    @Query('month') month: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.attendance.childCalendar(childId, month, user);
  }
}
