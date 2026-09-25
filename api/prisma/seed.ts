import { PrismaClient, Role } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'demo123';
const DEMO_PHONE_PREFIX = '+99890123456'; // +998901234561, ...2, ...3 ...

async function main() {
  console.log("Demo ma'lumotlar yaratilmoqda...");

  const passwordHash = await argon2.hash(DEMO_PASSWORD);

  const tenant = await prisma.tenant.upsert({
    where: { slug: 'kichkintoylar' },
    update: {},
    create: {
      name: "Kichkintoylar bog'chasi",
      slug: 'kichkintoylar',
      phone: '+998901234567',
      status: 'ACTIVE',
      currency: 'UZS',
      locale: 'uz',
    },
  });

  const branch = await prisma.branch.upsert({
    where: { id: `${tenant.id}-main-branch` },
    update: {},
    create: {
      id: `${tenant.id}-main-branch`,
      tenantId: tenant.id,
      name: 'Yunusobod filiali',
      address: 'Toshkent sh., Yunusobod tumani',
      phone: '+998901234567',
      workDays: [1, 2, 3, 4, 5],
      openTime: '07:00',
      closeTime: '19:00',
    },
  });

  const group = await prisma.group.upsert({
    where: { id: `${tenant.id}-quyoshcha` },
    update: {},
    create: {
      id: `${tenant.id}-quyoshcha`,
      tenantId: tenant.id,
      branchId: branch.id,
      name: 'Quyoshcha',
      ageMin: 24,
      ageMax: 36,
      capacity: 20,
      colorHex: '#FFB020',
    },
  });

  const owner = await prisma.user.upsert({
    where: { tenantId_phone: { tenantId: tenant.id, phone: `${DEMO_PHONE_PREFIX}1` } },
    update: {},
    create: {
      tenantId: tenant.id,
      fullName: "Aziz Karimov",
      phone: `${DEMO_PHONE_PREFIX}1`,
      passwordHash,
      role: Role.OWNER,
    },
  });

  const teacher = await prisma.user.upsert({
    where: { tenantId_phone: { tenantId: tenant.id, phone: `${DEMO_PHONE_PREFIX}2` } },
    update: {},
    create: {
      tenantId: tenant.id,
      fullName: "Malika Yusupova",
      phone: `${DEMO_PHONE_PREFIX}2`,
      passwordHash,
      role: Role.TEACHER,
    },
  });

  await prisma.groupTeacher.upsert({
    where: { groupId_userId: { groupId: group.id, userId: teacher.id } },
    update: {},
    create: { groupId: group.id, userId: teacher.id, isMain: true },
  });

  const parent = await prisma.user.upsert({
    where: { tenantId_phone: { tenantId: tenant.id, phone: `${DEMO_PHONE_PREFIX}3` } },
    update: {},
    create: {
      tenantId: tenant.id,
      fullName: "Nodira Rashidova",
      phone: `${DEMO_PHONE_PREFIX}3`,
      role: Role.PARENT,
    },
  });

  const child = await prisma.child.upsert({
    where: { id: `${tenant.id}-amirbek` },
    update: {},
    create: {
      id: `${tenant.id}-amirbek`,
      tenantId: tenant.id,
      branchId: branch.id,
      groupId: group.id,
      firstName: 'Amirbek',
      lastName: 'Rashidov',
      birthDate: new Date('2023-04-12'),
      gender: 'MALE',
      status: 'ACTIVE',
      enrolledAt: new Date('2025-09-01'),
    },
  });

  await prisma.guardian.upsert({
    where: { childId_userId: { childId: child.id, userId: parent.id } },
    update: {},
    create: { childId: child.id, userId: parent.id, relation: 'Ona', isPrimary: true },
  });

  const existingSuperAdmin = await prisma.user.findFirst({
    where: { phone: `${DEMO_PHONE_PREFIX}0`, tenantId: null },
  });
  const superAdmin =
    existingSuperAdmin ??
    (await prisma.user.create({
      data: { fullName: 'Super Admin', phone: `${DEMO_PHONE_PREFIX}0`, passwordHash, role: Role.SUPER_ADMIN },
    }));

  console.log("Demo ma'lumotlar tayyor:");
  console.log(`  SUPER_ADMIN: ${superAdmin.phone} / ${DEMO_PASSWORD}`);
  console.log(`  OWNER:       ${owner.phone} / ${DEMO_PASSWORD}`);
  console.log(`  TEACHER:     ${teacher.phone} / ${DEMO_PASSWORD}`);
  console.log(`  PARENT:      ${parent.phone} (SMS OTP orqali kiradi — kod konsolda ko'rinadi)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
