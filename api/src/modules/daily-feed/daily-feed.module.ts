import { Module } from '@nestjs/common';
import { DailyFeedController } from './daily-feed.controller';
import { DailyFeedService } from './daily-feed.service';

@Module({
  controllers: [DailyFeedController],
  providers: [DailyFeedService],
})
export class DailyFeedModule {}
