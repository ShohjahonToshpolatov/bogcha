export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
}

export enum ChildStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  LEFT = 'LEFT',
  WAITLIST = 'WAITLIST',
}

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  LATE = 'LATE',
  SICK = 'SICK',
  VACATION = 'VACATION',
}

export enum PostType {
  PHOTO = 'PHOTO',
  VIDEO = 'VIDEO',
  TEXT = 'TEXT',
  ACTIVITY = 'ACTIVITY',
  MOOD = 'MOOD',
}

export interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string;
  workDays: number[];
  openTime: string;
  closeTime: string;
  isActive: boolean;
}

export interface GroupTeacherLink {
  id: string;
  groupId: string;
  userId: string;
  isMain: boolean;
  user: { id: string; fullName: string; avatarUrl: string | null; phone?: string };
}

export interface Group {
  id: string;
  branchId: string;
  name: string;
  ageMin: number;
  ageMax: number;
  capacity: number;
  colorHex: string;
  isActive: boolean;
  branch?: { id: string; name: string };
  teachers?: GroupTeacherLink[];
  _count?: { children: number };
}

export interface Allergy {
  id: string;
  title: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  reaction?: string | null;
}

export interface Guardian {
  id: string;
  childId: string;
  userId: string;
  relation: string;
  isPrimary: boolean;
  canPickup: boolean;
  canPay: boolean;
  user: { id: string; fullName: string; phone: string };
}

export interface Child {
  id: string;
  branchId: string;
  groupId: string | null;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  birthDate: string;
  gender: Gender;
  photoUrl?: string | null;
  address?: string | null;
  specialNotes?: string | null;
  status: ChildStatus;
  enrolledAt: string;
  group?: { id: string; name: string; colorHex: string } | null;
  guardians?: Guardian[];
  allergies?: Allergy[];
}

export interface CreateGuardianInput {
  phone: string;
  fullName: string;
  relation: string;
  isPrimary?: boolean;
  canPickup?: boolean;
  canPay?: boolean;
}

export interface CreateChildInput {
  firstName: string;
  lastName: string;
  middleName?: string;
  birthDate: string;
  gender: Gender;
  branchId: string;
  groupId?: string;
  address?: string;
  enrolledAt?: string;
  guardians?: CreateGuardianInput[];
}

export interface AttendanceRecord {
  id: string;
  childId: string;
  groupId: string;
  date: string;
  status: AttendanceStatus;
  checkInAt?: string | null;
  checkOutAt?: string | null;
  absenceReason?: string | null;
  temperature?: string | null;
}

export interface DailyAttendanceEntry {
  child: Child;
  attendance: AttendanceRecord | null;
}

export interface StaffProfile {
  id: string;
  position: string;
  salaryAmount: string;
}

export interface StaffMember {
  id: string;
  fullName: string;
  phone: string;
  role: 'OWNER' | 'ADMIN' | 'TEACHER' | 'NURSE' | 'COOK';
  status: 'ACTIVE' | 'INVITED' | 'BLOCKED';
  avatarUrl?: string | null;
  staffProfile?: StaffProfile | null;
  groupTeacherLinks?: { group: { id: string; name: string } }[];
}

export interface InviteStaffInput {
  phone: string;
  fullName: string;
  role: 'ADMIN' | 'TEACHER' | 'NURSE' | 'COOK';
  position?: string;
  groupIds?: string[];
}

export interface DailyPost {
  id: string;
  groupId: string;
  childId?: string | null;
  type: PostType;
  title?: string | null;
  body?: string | null;
  activityTag?: string | null;
  mood?: string | null;
  postedAt: string;
  author: { id: string; fullName: string; avatarUrl: string | null };
  child?: { id: string; firstName: string; lastName: string } | null;
  group?: { id: string; name: string; colorHex: string };
  mediaIds: string[];
  mediaUrls: string[];
}

export interface CreatePostInput {
  groupId: string;
  childId?: string;
  type: PostType;
  title?: string;
  body?: string;
  activityTag?: string;
  mediaIds?: string[];
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ---------- Kameralar ----------
export interface Camera {
  id: string;
  branchId: string;
  groupId?: string | null;
  name: string;
  streamKey: string;
  status: 'ONLINE' | 'OFFLINE' | 'ERROR';
  visibleToParents: boolean;
  schedule: Record<string, [string, string][]>;
  maxViewMinutes: number;
  lastSeenAt?: string | null;
  group?: { id: string; name: string; colorHex: string } | null;
  branch?: { id: string; name: string };
}

export interface UpsertCameraInput {
  branchId: string;
  groupId?: string;
  name: string;
  rtspUrl?: string;
  visibleToParents?: boolean;
  schedule?: Record<string, [string, string][]>;
  maxViewMinutes?: number;
}

export interface CameraSession {
  sessionId: string;
  token: string;
  streamKey: string;
  hlsUrl: string;
  webrtcUrl: string;
  expiresAt: string;
  maxSeconds: number;
}

export interface CameraAccessLog {
  id: string;
  userId: string;
  startedAt: string;
  endedAt?: string | null;
  user: { id: string; fullName: string; role: string };
}

// ---------- E'lonlar ----------
export interface Announcement {
  id: string;
  title: string;
  body: string;
  groupId?: string | null;
  branchId?: string | null;
  isPinned: boolean;
  publishAt: string;
  expiresAt?: string | null;
  author: { id: string; fullName: string };
  group?: { id: string; name: string } | null;
  _count?: { reads: number };
}

export interface UpsertAnnouncementInput {
  title: string;
  body: string;
  groupId?: string;
  branchId?: string;
  isPinned?: boolean;
  expiresAt?: string;
}

// ---------- Menyu ----------
export enum MealType {
  BREAKFAST = 'BREAKFAST',
  LUNCH = 'LUNCH',
  SNACK = 'SNACK',
  DINNER = 'DINNER',
}

export interface Dish {
  name: string;
  portion?: string;
  allergens?: string[];
}

export interface MenuDay {
  id: string;
  branchId: string;
  date: string;
  mealType: MealType;
  dishes: Dish[];
}

// ---------- Navbat ----------
export enum WaitlistStatus {
  NEW = 'NEW',
  CONTACTED = 'CONTACTED',
  TOUR_BOOKED = 'TOUR_BOOKED',
  ENROLLED = 'ENROLLED',
  REJECTED = 'REJECTED',
}

export interface WaitlistItem {
  id: string;
  childName: string;
  birthDate: string;
  parentName: string;
  parentPhone: string;
  desiredStart: string;
  groupId?: string | null;
  branchId?: string | null;
  status: WaitlistStatus;
  source?: string | null;
  note?: string | null;
  createdAt: string;
}

export interface UpsertWaitlistInput {
  childName: string;
  birthDate: string;
  parentName: string;
  parentPhone: string;
  desiredStart: string;
  groupId?: string;
  branchId?: string;
  source?: string;
  note?: string;
}

// ---------- Moliya ----------
export interface Tariff {
  id: string;
  name: string;
  monthlyAmount: string;
  includesMeals: boolean;
  siblingDiscountPct: number;
  isActive: boolean;
}

export interface UpsertTariffInput {
  name: string;
  monthlyAmount: string;
  includesMeals?: boolean;
  siblingDiscountPct?: number;
}

export enum InvoiceStatus {
  UNPAID = 'UNPAID',
  PARTIAL = 'PARTIAL',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
}

export interface Invoice {
  id: string;
  number: string;
  period: string;
  baseAmount: string;
  discount: string;
  totalAmount: string;
  paidAmount: string;
  dueDate: string;
  status: InvoiceStatus;
  child: { id: string; firstName: string; lastName: string };
}

export enum PaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
  PAYME = 'PAYME',
  CLICK = 'CLICK',
  TRANSFER = 'TRANSFER',
}

export interface Payment {
  id: string;
  amount: string;
  method: PaymentMethod;
  paidAt: string;
  note?: string | null;
  child: { id: string; firstName: string; lastName: string };
}

export interface Debt extends Invoice {
  remaining: number;
  daysOverdue: number;
}

// ---------- Hisobotlar ----------
export interface DashboardStats {
  presentToday: number;
  totalActive: number;
  capacity: number;
  monthRevenue: number;
  debtTotal: number;
  debtChildCount: number;
  newWaitlist: number;
  staffCount: number;
  staffActive: number;
}

export interface OccupancyRow {
  groupId: string;
  name: string;
  capacity: number;
  enrolled: number;
  percentage: number;
}

// ---------- Tenant sozlamalari ----------
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  phone: string;
  email?: string | null;
  address?: string | null;
  currency: string;
  locale: string;
  status: string;
}

export interface UpdateTenantInput {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
}

// ---------- Muloqot (Messaging) ----------
export interface ThreadParticipantSummary {
  id: string;
  fullName: string;
  avatarUrl?: string | null;
  role: string;
}

export interface ThreadListItem {
  id: string;
  child: { id: string; firstName: string; lastName: string; photoUrl?: string | null } | null;
  others: ThreadParticipantSummary[];
  lastMessage: { body: string | null; sentAt: string; senderId: string } | null;
  lastMessageAt: string | null;
  unread: boolean;
}

export interface ThreadMessage {
  id: string;
  threadId: string;
  senderId: string;
  body: string | null;
  mediaIds: string[];
  sentAt: string;
  sender: { id: string; fullName: string; avatarUrl?: string | null };
}
