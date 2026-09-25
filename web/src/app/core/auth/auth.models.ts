export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  TEACHER = 'TEACHER',
  NURSE = 'NURSE',
  COOK = 'COOK',
  PARENT = 'PARENT',
}

export interface CurrentUser {
  id: string;
  tenantId: string | null;
  fullName: string;
  phone: string;
  email?: string | null;
  role: Role;
  avatarUrl?: string | null;
  locale: string;
  tenant?: {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string | null;
    currency: string;
    locale: string;
    status: string;
  } | null;
  groupTeacherLinks?: { groupId: string; isMain: boolean }[];
  guardianLinks?: { childId: string; isPrimary: boolean; canPickup: boolean; canPay: boolean }[];
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: CurrentUser;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}
