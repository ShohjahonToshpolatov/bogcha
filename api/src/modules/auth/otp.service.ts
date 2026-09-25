import { BadRequestException, HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

const OTP_TTL_MINUTES = 5;
const OTP_MAX_ATTEMPTS = 3;
const OTP_BLOCK_MINUTES = 15;
const OTP_RESEND_COOLDOWN_SECONDS = 60;

/**
 * SMS orqali bir martalik kod yuborish va tekshirish.
 * Haqiqiy SMS provayder (Eskiz.uz / Play Mobile) `notifications` modulida ulanadi;
 * hozircha dev muhitda kod konsolga chiqariladi.
 */
@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(private readonly prisma: PrismaService) {}

  async requestOtp(phone: string): Promise<void> {
    const recent = await this.prisma.otpCode.findFirst({
      where: { phone },
      orderBy: { createdAt: 'desc' },
    });

    if (recent && recent.createdAt.getTime() > Date.now() - OTP_RESEND_COOLDOWN_SECONDS * 1000) {
      throw new HttpException(
        "Kod allaqachon yuborilgan. Birozdan so'ng qayta urinib ko'ring.",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const code = this.generateCode();
    const codeHash = await argon2.hash(code);

    await this.prisma.otpCode.create({
      data: {
        phone,
        codeHash,
        maxAttempts: OTP_MAX_ATTEMPTS,
        expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000),
      },
    });

    await this.sendSms(phone, code);
  }

  async verifyOtp(phone: string, code: string): Promise<void> {
    const otp = await this.prisma.otpCode.findFirst({
      where: { phone, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp) {
      throw new BadRequestException("Kod topilmadi. Avval kodni so'rang.");
    }
    if (otp.blockedUntil && otp.blockedUntil > new Date()) {
      throw new HttpException(
        `Juda ko'p noto'g'ri urinish. ${OTP_BLOCK_MINUTES} daqiqadan so'ng qayta urinib ko'ring.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (otp.expiresAt < new Date()) {
      throw new BadRequestException("Kod muddati tugagan. Yangi kod so'rang.");
    }

    const isValid = await argon2.verify(otp.codeHash, code);
    if (!isValid) {
      const attempts = otp.attempts + 1;
      const blockedUntil = attempts >= otp.maxAttempts ? new Date(Date.now() + OTP_BLOCK_MINUTES * 60 * 1000) : null;
      await this.prisma.otpCode.update({
        where: { id: otp.id },
        data: { attempts, blockedUntil },
      });
      throw new BadRequestException("Kod noto'g'ri");
    }

    await this.prisma.otpCode.update({
      where: { id: otp.id },
      data: { consumedAt: new Date() },
    });
  }

  private generateCode(): string {
    return crypto.randomInt(100000, 999999).toString();
  }

  private async sendSms(phone: string, code: string): Promise<void> {
    // TODO(notifications-moduli): Eskiz.uz / Play Mobile integratsiyasi shu yerga ulanadi.
    this.logger.log(`[DEV] SMS ${phone} ga: Bog'cham tasdiqlash kodi: ${code}`);
  }
}
