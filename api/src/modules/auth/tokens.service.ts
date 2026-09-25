import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * Access token: 15 daqiqa, JWT ichida saqlanadi.
 * Refresh token: 30 kun, faqat hash holida DB ga yoziladi (RefreshToken jadvali),
 * har ishlatilganda eskisi bekor qilinadi va yangisi beriladi (rotation).
 */
@Injectable()
export class TokensService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async issueTokenPair(
    user: Pick<User, 'id' | 'tenantId' | 'role' | 'phone' | 'fullName'>,
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<TokenPair> {
    const accessToken = this.jwt.sign(
      {
        sub: user.id,
        tenantId: user.tenantId,
        role: user.role,
        phone: user.phone,
        fullName: user.fullName,
      },
      {
        secret: this.config.get<string>('jwt.accessSecret'),
        expiresIn: this.config.get<string>('jwt.accessExpiresIn'),
      },
    );

    const refreshToken = this.generateOpaqueToken();
    const refreshExpiresInDays = this.config.get<number>('jwt.refreshExpiresInDays') ?? 30;
    const expiresAt = new Date(Date.now() + refreshExpiresInDays * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(refreshToken),
        expiresAt,
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
      },
    });

    return { accessToken, refreshToken };
  }

  /** Refresh tokenni tekshiradi, eskisini bekor qiladi va yangi juftlikni qaytaradi (rotation). */
  async rotateRefreshToken(rawToken: string, meta?: { ipAddress?: string; userAgent?: string }): Promise<TokenPair> {
    const tokenHash = this.hashToken(rawToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException("Sessiya muddati tugagan, qaytadan tizimga kiring");
    }
    if (stored.user.status === 'BLOCKED') {
      throw new UnauthorizedException('Hisob bloklangan');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokenPair(stored.user, meta);
  }

  async revokeRefreshToken(rawToken: string): Promise<void> {
    const tokenHash = this.hashToken(rawToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private generateOpaqueToken(): string {
    return crypto.randomBytes(48).toString('base64url');
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
