import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Request } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user.interface';
import { CamerasService } from './cameras.service';
import { UpsertCameraDto } from './dto/upsert-camera.dto';

@ApiTags('cameras')
@ApiBearerAuth()
@Controller('cameras')
export class CamerasController {
  constructor(private readonly cameras: CamerasService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.cameras.findAll(user);
  }

  @Roles(Role.OWNER)
  @Post()
  create(@Body() dto: UpsertCameraDto) {
    return this.cameras.create(dto);
  }

  @Roles(Role.OWNER)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<UpsertCameraDto>) {
    return this.cameras.update(id, dto);
  }

  @Roles(Role.OWNER)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.cameras.remove(id);
  }

  @Roles(Role.OWNER)
  @Post(':id/test')
  test(@Param('id') id: string) {
    return this.cameras.test(id);
  }

  @Post(':id/session')
  createSession(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    return this.cameras.createSession(id, user, { ipAddress: req.ip, userAgent: req.headers['user-agent'] });
  }

  @Post(':id/session/:sessionId/heartbeat')
  heartbeat(@Param('id') id: string, @Param('sessionId') sessionId: string) {
    return this.cameras.heartbeat(id, sessionId);
  }

  @Delete(':id/session/:sessionId')
  endSession(@Param('id') id: string, @Param('sessionId') sessionId: string) {
    return this.cameras.endSession(id, sessionId);
  }

  @Roles(Role.OWNER)
  @Get(':id/access-logs')
  accessLogs(@Param('id') id: string) {
    return this.cameras.accessLogs(id);
  }
}
