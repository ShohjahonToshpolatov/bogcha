import { PrismaClient, Role, Gender, AttendanceStatus } from '@prisma/client';

const prisma = new PrismaClient();

const BOY_NAMES = ['Sardor', 'Jasur', 'Diyor', 'Mirodil', 'Aziz', 'Bekzod', 'Sanjar'];
const GIRL_NAMES = ['Zarina', 'Malika', 'Dilnoza', 'Nigora', 'Sevinch', 'Gulnoza'];
const LAST_NAMES = ['Karimov', 'Yusupov', 'Rashidov', 'Aliyev', 'Tursunov', 'Nazarov', 'Ergashev', 'Sattorov'];

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

async function main() {
  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { slug: 'kichkintoylar' } });
  const branch = await prisma.branch.findFirstOrThrow({ where: { tenantId: tenant.id } });
  const quyoshcha = await prisma.group.findFirstOrThrow({ where: { tenantId: tenant.id, name: 'Quyoshcha' } });
  const kapalak = await prisma.group.findFirstOrThrow({ where: { tenantId: tenant.id, name: 'Kapalak' } });

  const tayyorlov = await prisma.group.upsert({
    where: { id: `${tenant.id}-tayyorlov` },
    update: {},
    create: {
      id: `${tenant.id}-tayyorlov`,
      tenantId: tenant.id,
      branchId: branch.id,
      name: 'Tayyorlov',
      ageMin: 48,
      ageMax: 72,
      capacity: 18,
      colorHex: '#9B5DE5',
    },
  });

  const chaqaloqlar = await prisma.group.upsert({
    where: { id: `${tenant.id}-chaqaloqlar` },
    update: {},
    create: {
      id: `${tenant.id}-chaqaloqlar`,
      tenantId: tenant.id,
      branchId: branch.id,
      name: 'Chaqaloqlar',
      ageMin: 12,
      ageMax: 24,
      capacity: 15,
      colorHex: '#00BBF9',
    },
  });

  const groups = [quyoshcha, kapalak, tayyorlov, chaqaloqlar];
  const today = new Date(new Date().toISOString().slice(0, 10));

  let boyIdx = 0;
  let girlIdx = 0;
  const createdChildren: string[] = [];

  for (let i = 0; i < 16; i++) {
    const isBoy = i % 2 === 0;
    const firstName = isBoy ? pick(BOY_NAMES, boyIdx++) : pick(GIRL_NAMES, girlIdx++);
    const lastName = pick(LAST_NAMES, i);
    const group = groups[i % groups.length];
    const id = `${tenant.id}-demo-child-${i}`;

    const child = await prisma.child.upsert({
      where: { id },
      update: {},
      create: {
        id,
        tenantId: tenant.id,
        branchId: branch.id,
        groupId: group.id,
        firstName,
        lastName,
        birthDate: new Date(2021 + (i % 4), i % 12, (i % 27) + 1),
        gender: isBoy ? Gender.MALE : Gender.FEMALE,
        status: 'ACTIVE',
        enrolledAt: new Date('2025-09-01'),
      },
    });
    createdChildren.push(child.id);

    // Bugungi kun uchun davomat — aksariyati keldi, bir nechtasi kelmadi/kasal
    const status = i % 9 === 0 ? AttendanceStatus.SICK : i % 7 === 0 ? AttendanceStatus.ABSENT : AttendanceStatus.PRESENT;
    await prisma.attendance.upsert({
      where: { childId_date: { childId: child.id, date: today } },
      update: { status },
      create: {
        tenantId: tenant.id,
        childId: child.id,
        groupId: group.id,
        date: today,
        status,
        checkInAt: status === AttendanceStatus.PRESENT ? new Date(new Date().setHours(8, (i * 3) % 60)) : undefined,
      },
    });

    // Oxirgi 13 kunlik tarix uchun ham davomat (grafik chiroyli chiqishi uchun)
    for (let d = 1; d <= 13; d++) {
      const date = new Date(today);
      date.setDate(date.getDate() - d);
      const pastStatus = (i + d) % 6 === 0 ? AttendanceStatus.ABSENT : AttendanceStatus.PRESENT;
      await prisma.attendance.upsert({
        where: { childId_date: { childId: child.id, date } },
        update: {},
        create: {
          tenantId: tenant.id,
          childId: child.id,
          groupId: group.id,
          date,
          status: pastStatus,
          checkInAt: pastStatus === AttendanceStatus.PRESENT ? new Date(date.setHours(8, 15)) : undefined,
        },
      });
    }
  }

  // Moliya: tarif biriktirish + hisob-faktura + qisman to'lovlar (qarzdorlik chiroyli chiqishi uchun)
  const tariff = await prisma.tariff.findFirstOrThrow({ where: { tenantId: tenant.id } });
  const owner = await prisma.user.findFirstOrThrow({ where: { tenantId: tenant.id, role: Role.OWNER } });
  const period = new Date().toISOString().slice(0, 7);

  for (let i = 0; i < createdChildren.length; i++) {
    const childId = createdChildren[i];
    await prisma.childTariff.upsert({
      where: { id: `${childId}-tariff` },
      update: {},
      create: { id: `${childId}-tariff`, childId, tariffId: tariff.id, validFrom: new Date('2025-09-01') },
    });

    const total = Number(tariff.monthlyAmount);
    const paid = i % 3 === 0 ? 0 : i % 3 === 1 ? total / 2 : total;
    const status = paid === 0 ? 'UNPAID' : paid < total ? 'PARTIAL' : 'PAID';

    const invoice = await prisma.invoice.upsert({
      where: { id: `${childId}-inv` },
      update: {},
      create: {
        id: `${childId}-inv`,
        tenantId: tenant.id,
        childId,
        number: `INV-DEMO-${1000 + i}`,
        period,
        baseAmount: total,
        totalAmount: total,
        paidAmount: paid,
        dueDate: new Date(new Date().getFullYear(), new Date().getMonth(), 10),
        status: status as never,
      },
    });

    if (paid > 0) {
      await prisma.payment.upsert({
        where: { id: `${childId}-pay` },
        update: {},
        create: {
          id: `${childId}-pay`,
          tenantId: tenant.id,
          invoiceId: invoice.id,
          childId,
          amount: paid,
          method: 'CASH',
          receivedById: owner.id,
        },
      });
    }
  }

  console.log(`Tayyor: ${groups.length} guruh, ${createdChildren.length} yangi bola, davomat va moliya to'ldirildi.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
