import { SetMetadata } from '@nestjs/common';

/** Auth talab qilinmaydigan endpointlarni belgilaydi (masalan, login, OTP so'rash). */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
