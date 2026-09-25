import { Inject, Injectable, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { AuthenticatedUser } from '../common/types/authenticated-user.interface';
import { PrismaService } from './prisma.service';

/**
 * So'rov darajasida (request-scoped) tenantId bilan izolyatsiya qilingan Prisma klient.
 * Har bir modul o'zining servisida `PrismaService` o'rniga shuni ishlatadi —
 * shunda tenantId ni har safar qo'lda `where` ga qo'shishni unutish mumkin emas.
 * SUPER_ADMIN yoki hali autentifikatsiya qilinmagan so'rovlarda (masalan auth oqimi)
 * tenantId yo'q bo'lgani uchun izolyatsiyasiz klient qaytariladi.
 *
 * DIQQAT: `tenantId`/`client` getter sifatida yozilgan — chunki bu servis
 * controller metodi chaqirilishidan OLDIN (request-scoped provider daraxti
 * qurilayotganda) yaratilishi mumkin, ya'ni JwtAuthGuard `request.user`ni
 * hali o'rnatmagan bo'lishi mumkin. Getter bu qiymatni haqiqiy foydalanish
 * paytida (guardlar ishlab bo'lgandan keyin) o'qiydi.
 */
@Injectable({ scope: Scope.REQUEST })
export class TenantPrismaService {
  constructor(
    @Inject(REQUEST) private readonly request: Request & { user?: AuthenticatedUser },
    private readonly prisma: PrismaService,
  ) {}

  get tenantId(): string | null {
    return this.request.user?.tenantId ?? null;
  }

  get client(): PrismaService {
    const tenantId = this.tenantId;
    return tenantId ? (this.prisma.forTenant(tenantId) as PrismaService) : this.prisma;
  }
}
