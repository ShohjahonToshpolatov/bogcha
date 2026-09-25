import { SetMetadata } from '@nestjs/common';

export type OwnedResourceType = 'child' | 'group';

export interface ResourceOwnershipOptions {
  /** Qaysi turdagi resurs tekshiriladi. */
  type: OwnedResourceType;
  /** Route parametri nomi (masalan `:childId` uchun "childId"). Standart: "id". */
  param?: string;
}

export const RESOURCE_OWNERSHIP_KEY = 'resourceOwnership';

/**
 * TEACHER faqat o'z guruhiga, PARENT faqat o'z bolasiga tegishli resursga kira olishini
 * belgilaydi. Amalga oshirish ResourceOwnershipGuard da, bir joyda — har bir servisda
 * takrorlanmaydi.
 */
export const CheckOwnership = (options: ResourceOwnershipOptions) =>
  SetMetadata(RESOURCE_OWNERSHIP_KEY, { param: 'id', ...options });
