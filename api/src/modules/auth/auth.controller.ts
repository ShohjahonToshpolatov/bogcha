import { Body, Controller, Get, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../common/types/authenticated-user.interface';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { OtpRequestDto } from './dto/otp-request.dto';
import { OtpVerifyDto } from './dto/otp-verify.dto';
import { PushTokenDto } from './dto/push-token.dto';
import { RefreshDto } from './dto/refresh.dto';
import { TelegramLinkDto } from './dto/telegram-link.dto';
import { UpdateMeDto } from './dto/update-me.dto';

function requestMeta(req: Request) {
  return { ipAddress: req.ip, userAgent: req.headers['user-agent'] };
}

function toAuthResponse(tokens: { accessToken: string; refreshToken: string }, user: { passwordHash?: string | null }) {
  const { passwordHash: _passwordHash, ...safeUser } = user as Record<string, unknown>;
  return { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, user: safeUser };
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const { tokens, user } = await this.authService.login(dto.phone, dto.password, requestMeta(req));
    return toAuthResponse(tokens, user);
  }

  @Public()
  @Throttle({ default: { limit: 1, ttl: 60_000 } })
  @Post('otp/request')
  async requestOtp(@Body() dto: OtpRequestDto) {
    await this.authService.requestOtp(dto.phone);
    return { sent: true };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('otp/verify')
  async verifyOtp(@Body() dto: OtpVerifyDto, @Req() req: Request) {
    const { tokens, user } = await this.authService.verifyOtpAndLogin(dto.phone, dto.code, requestMeta(req));
    return toAuthResponse(tokens, user);
  }

  @Public()
  @Post('refresh')
  async refresh(@Body() dto: RefreshDto, @Req() req: Request) {
    const tokens = await this.authService.refresh(dto.refreshToken, requestMeta(req));
    return tokens;
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('logout')
  async logout(@Body() dto: RefreshDto) {
    await this.authService.logout(dto.refreshToken);
    return { loggedOut: true };
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('me')
  async me(@CurrentUser('userId') userId: string) {
    return this.authService.getMe(userId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch('me')
  async updateMe(@CurrentUser('userId') userId: string, @Body() dto: UpdateMeDto) {
    return this.authService.updateMe(userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('change-password')
  async changePassword(@CurrentUser('userId') userId: string, @Body() dto: ChangePasswordDto) {
    await this.authService.changePassword(userId, dto.oldPassword, dto.newPassword);
    return { changed: true };
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('push-token')
  async addPushToken(@CurrentUser() user: AuthenticatedUser, @Body() dto: PushTokenDto) {
    await this.authService.addPushToken(user.userId, dto.token);
    return { added: true };
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('telegram/link')
  async linkTelegram(@CurrentUser('userId') userId: string, @Body() dto: TelegramLinkDto) {
    await this.authService.linkTelegram(userId, dto.code);
    return { linked: true };
  }
}
