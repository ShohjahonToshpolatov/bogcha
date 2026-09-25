import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Role, User, UserStatus } from '@prisma/client';
import * as argon2 from 'argon2';
import { PrismaService } from '../../prisma/prisma.service';
import { OtpService } from './otp.service';
import { TokenPair, TokensService } from './tokens.service';

export interface RequestMeta {
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokensService,
    private readonly otp: OtpService,
  ) {}

  /** Xodimlar uchun: telefon + parol bilan kirish. */
  async login(phone: string, password: string, meta?: RequestMeta): Promise<{ tokens: TokenPair; user: User }> {
    const user = await this.prisma.user.findFirst({ where: { phone } });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException("Telefon raqam yoki parol noto'g'ri");
    }
    if (user.status === UserStatus.BLOCKED) {
      throw new UnauthorizedException('Hisobingiz bloklangan. Ma\'muriyat bilan bog\'laning.');
    }

    const passwordMatches = await argon2.verify(user.passwordHash, password);
    if (!passwordMatches) {
      throw new UnauthorizedException("Telefon raqam yoki parol noto'g'ri");
    }

    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    const tokens = await this.tokens.issueTokenPair(user, meta);
    return { tokens, user };
  }

  /** Ota-onalar uchun: SMS kod so'rash. Mavjud bo'lmagan raqamlar uchun ham bir xil javob (enumeration oldini olish). */
  async requestOtp(phone: string): Promise<void> {
    await this.otp.requestOtp(phone);
  }

  /**
   * Ota-onalar uchun: SMS kodni tasdiqlab kirish.
   * Agar bunday PARENT hali mavjud bo'lmasa (masalan, birinchi marta kirmoqda, lekin
   * Guardian orqali oldindan taklif qilingan bo'lsa) — mavjud userni topadi;
   * aks holda kirish rad etiladi (bola/vasiylik OWNER tomonidan oldindan yaratilishi shart).
   */
  async verifyOtpAndLogin(phone: string, code: string, meta?: RequestMeta): Promise<{ tokens: TokenPair; user: User }> {
    await this.otp.verifyOtp(phone, code);

    const user = await this.prisma.user.findFirst({ where: { phone, role: Role.PARENT } });
    if (!user) {
      throw new NotFoundException(
        "Bu raqam tizimda ro'yxatdan o'tmagan. Bog'cha ma'muriyati bilan bog'laning.",
      );
    }
    if (user.status === UserStatus.BLOCKED) {
      throw new UnauthorizedException('Hisobingiz bloklangan. Ma\'muriyat bilan bog\'laning.');
    }

    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    const tokens = await this.tokens.issueTokenPair(user, meta);
    return { tokens, user };
  }

  async refresh(refreshToken: string, meta?: RequestMeta): Promise<TokenPair> {
    return this.tokens.rotateRefreshToken(refreshToken, meta);
  }

  async logout(refreshToken: string): Promise<void> {
    await this.tokens.revokeRefreshToken(refreshToken);
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        tenant: { select: { id: true, name: true, slug: true, logoUrl: true, currency: true, locale: true, status: true } },
        groupTeacherLinks: { select: { groupId: true, isMain: true } },
        guardianLinks: { select: { childId: true, isPrimary: true, canPickup: true, canPay: true } },
      },
    });
    if (!user) {
      throw new NotFoundException('Foydalanuvchi topilmadi');
    }
    const { passwordHash: _passwordHash, ...safeUser } = user;
    return safeUser;
  }

  async updateMe(userId: string, data: { fullName?: string; locale?: string; avatarUrl?: string }) {
    return this.prisma.user.update({ where: { id: userId }, data });
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.passwordHash) {
      throw new BadRequestException("Bu hisob uchun parol o'rnatilmagan");
    }
    const matches = await argon2.verify(user.passwordHash, oldPassword);
    if (!matches) {
      throw new BadRequestException("Joriy parol noto'g'ri");
    }
    const passwordHash = await argon2.hash(newPassword);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    await this.tokens.revokeAllForUser(userId);
  }

  async addPushToken(userId: string, token: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { pushTokens: true } });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');
    if (user.pushTokens.includes(token)) return;
    await this.prisma.user.update({
      where: { id: userId },
      data: { pushTokens: { push: token } },
    });
  }

  /**
   * Foydalanuvchi Telegram botga `/start` bosib olgan bir martalik kodni ilovaga kiritadi.
   * TODO(notifications-moduli): kod → chatId moslamasi Redis'da botdan saqlanadi (7-bosqich).
   * Hozircha kod to'g'ridan-to'g'ri chatId sifatida ishlatiladi (dev stub).
   */
  async linkTelegram(userId: string, code: string): Promise<void> {
    await this.prisma.user.update({ where: { id: userId }, data: { telegramChatId: code } });
  }
}
