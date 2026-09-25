import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// Rolga ega bo'lmagan (SUPER_ADMIN) so'rovlar uchun tenantId talab qilinmaydi.
const TENANT_SCOPED_MODELS = new Set([
  'branch',
  'group',
  'user',
  'child',
  'attendance',
  'dailyPost',
  'menuDay',
  'healthRecord',
  'thread',
  'announcement',
  'tariff',
  'invoice',
  'payment',
  'camera',
  'cameraAccessLog',
  'curriculumPlan',
  'milestone',
  'media',
  'document',
  'waitlist',
  'notification',
  'auditLog',
  'calendarEvent',
]);

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    await this.$connect();
    this.logger.log('PostgreSQL ga ulanish o\'rnatildi');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Berilgan tenantId bilan izolyatsiya qilingan Prisma klient nusxasini qaytaradi.
   * Har bir so'rovga avtomatik `where: { tenantId }` qo'shiladi (multi-tenant izolyatsiya).
   * SUPER_ADMIN uchun bu chaqirilmaydi — u xom `this` (PrismaService) dan foydalanadi.
   */
  forTenant(tenantId: string) {
    return this.$extends({
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }) {
            const modelKey = model ? model.charAt(0).toLowerCase() + model.slice(1) : '';
            if (!TENANT_SCOPED_MODELS.has(modelKey)) {
              return query(args);
            }
            const a = args as Record<string, unknown>;
            if (['findMany', 'findFirst', 'count', 'aggregate', 'groupBy'].includes(operation)) {
              a.where = { ...(a.where as object), tenantId };
            } else if (['findUnique', 'findUniqueOrThrow', 'update', 'delete'].includes(operation)) {
              a.where = { ...(a.where as object), tenantId };
            } else if (['create'].includes(operation)) {
              a.data = { ...(a.data as object), tenantId };
            } else if (['createMany'].includes(operation)) {
              const data = a.data as Array<Record<string, unknown>>;
              a.data = data.map((d) => ({ ...d, tenantId }));
            } else if (['updateMany', 'deleteMany'].includes(operation)) {
              a.where = { ...(a.where as object), tenantId };
            }
            return query(a);
          },
        },
      },
    }) as unknown as PrismaService;
  }
}
