import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import configuration from './config/configuration';
import { validate } from './config/env.validation';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { ResourceOwnershipGuard } from './common/guards/resource-ownership.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { TenantGuard } from './common/guards/tenant.guard';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { BranchesModule } from './modules/branches/branches.module';
import { GroupsModule } from './modules/groups/groups.module';
import { ChildrenModule } from './modules/children/children.module';
import { StaffModule } from './modules/staff/staff.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { DailyFeedModule } from './modules/daily-feed/daily-feed.module';
import { MessagingModule } from './modules/messaging/messaging.module';
import { CamerasModule } from './modules/cameras/cameras.module';
import { AnnouncementsModule } from './modules/announcements/announcements.module';
import { MenuModule } from './modules/menu/menu.module';
import { WaitlistModule } from './modules/waitlist/waitlist.module';
import { BillingModule } from './modules/billing/billing.module';
import { ReportsModule } from './modules/reports/reports.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { MediaModule } from './modules/media/media.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate,
      envFilePath: ['.env'],
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    PrismaModule,
    AuthModule,
    BranchesModule,
    GroupsModule,
    ChildrenModule,
    StaffModule,
    AttendanceModule,
    DailyFeedModule,
    MessagingModule,
    CamerasModule,
    AnnouncementsModule,
    MenuModule,
    WaitlistModule,
    BillingModule,
    ReportsModule,
    TenantsModule,
    MediaModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Guardlar shu tartibda ishlaydi: avval autentifikatsiya, keyin tenant, rol,
    // eng oxirida resurs egaligi. @Public() bo'lmagan HAR BIR endpoint himoyalangan —
    // buni chetlab o'tish uchun controllerda alohida @UseGuards() yozish shart emas.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: TenantGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ResourceOwnershipGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TimeoutInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
  ],
})
export class AppModule {}
