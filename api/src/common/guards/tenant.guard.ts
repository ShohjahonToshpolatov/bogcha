import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AuthenticatedUser } from '../types/authenticated-user.interface';

/**
 * SUPER_ADMIN dan boshqa har bir foydalanuvchi tenantId ga ega bo'lishi shart.
 * tenantId FAQAT JWT dan olinadi — hech qachon query/body/param orqali qabul qilinmaydi,
 * shuning uchun bu yerda faqat borligini tekshiramiz, o'zgartirmaymiz.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser = request.user;

    if (!user) {
      return false;
    }
    if (user.role === Role.SUPER_ADMIN) {
      return true;
    }
    if (!user.tenantId) {
      throw new ForbiddenException("Foydalanuvchi hech qanday bog'chaga biriktirilmagan");
    }
    return true;
  }
}
