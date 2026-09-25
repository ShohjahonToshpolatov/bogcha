import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@Roles(Role.OWNER, Role.ADMIN)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('dashboard')
  dashboard() {
    return this.reports.dashboard();
  }

  @Get('occupancy')
  occupancy() {
    return this.reports.occupancy();
  }

  @Get('attendance-trend')
  attendanceTrend(@Query('days') days?: string) {
    return this.reports.attendanceTrend(days ? parseInt(days, 10) : 14);
  }

  @Get('gender-breakdown')
  genderBreakdown() {
    return this.reports.genderBreakdown();
  }

  @Get('churn')
  churn(@Query('from') from: string, @Query('to') to: string) {
    return this.reports.churn(from, to);
  }
}
