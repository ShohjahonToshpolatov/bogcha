import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Joriy so'rovning tenantId sini JWT payloaddan qaytaradi.
 * DIQQAT: tenantId hech qachon query/body parametridan olinmaydi — faqat token ichidan.
 */
export const TenantId = createParamDecorator((_data: unknown, ctx: ExecutionContext): string | null => {
  const request = ctx.switchToHttp().getRequest();
  return request.user?.tenantId ?? null;
});
