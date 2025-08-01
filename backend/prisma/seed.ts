import { PrismaClient, Role, TicketStatus, Priority } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create Users
  const user1 = await prisma.user.create({
    data: {
      auth0Id: 'auth0|demo123',
      email: 'jane@example.com',
      name: 'Jane Doe',
      phone: '555-1234',
      role: Role.USER,
    },
  });

  const user2 = await prisma.user.create({
    data: {
      auth0Id: 'auth0|demo456',
      email: 'john@example.com',
      name: 'John Smith',
      phone: '555-5678',
      role: Role.ADMIN,
      marketCenter: {
        create: {
          title: 'Downtown Office',
          description: 'Handles all downtown train routes.',
        },
      },
    },
  });

  // Create Tickets for Jane
  await prisma.ticket.createMany({
    data: [
      {
        title: 'Missed Train Connection',
        description: 'Missed connection due to delay, need help rescheduling.',
        status: TicketStatus.CREATED,
        priority: Priority.HIGH,
        userId: user1.id,
      },
      {
        title: 'Seat Change Request',
        description: 'Would like to move to a window seat if possible.',
        status: TicketStatus.PENDING,
        priority: Priority.MEDIUM,
        userId: user1.id,
      },
      {
        title: 'Refund Inquiry',
        description: 'Train was canceled, requesting refund info.',
        status: TicketStatus.COMPLETED,
        priority: Priority.LOW,
        userId: user1.id,
      },
    ],
  });

  console.log('✅ Seed complete.');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
