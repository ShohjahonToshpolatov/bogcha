import { Role } from '@prisma/client';

/** JWT access token payloadidan olingan va requestga biriktirilgan foydalanuvchi ma'lumoti. */
export interface AuthenticatedUser {
  userId: string;
  tenantId: string | null;
  role: Role;
  phone: string;
  fullName: string;
  /** TEACHER uchun — biriktirilgan guruh IDlari. */
  assignedGroupIds?: string[];
  /** PARENT uchun — vasiylik qilingan bola IDlari. */
  guardianOfChildIds?: string[];
}
