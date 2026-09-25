import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user.interface';
import { SendMessageDto } from './dto/send-message.dto';
import { StartThreadDto } from './dto/start-thread.dto';
import { MessagingService } from './messaging.service';

@ApiTags('messaging')
@ApiBearerAuth()
@Controller('messaging')
export class MessagingController {
  constructor(private readonly messaging: MessagingService) {}

  @Get('threads')
  listThreads(@CurrentUser() user: AuthenticatedUser) {
    return this.messaging.listThreads(user);
  }

  @Get('threads/:id/messages')
  getMessages(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.messaging.getMessages(id, user, page ? Number(page) : 1, limit ? Number(limit) : 50);
  }

  @Post('threads')
  startOrSend(@Body() dto: StartThreadDto, @CurrentUser() user: AuthenticatedUser) {
    return this.messaging.startOrSend(dto, user);
  }

  @Post('threads/:id/messages')
  sendMessage(@Param('id') id: string, @Body() dto: SendMessageDto, @CurrentUser() user: AuthenticatedUser) {
    return this.messaging.sendMessage(id, dto, user);
  }

  @Post('threads/:id/read')
  markRead(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.messaging.markRead(id, user);
  }
}
