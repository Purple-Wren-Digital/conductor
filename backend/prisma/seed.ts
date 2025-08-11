import { PrismaClient, Role, TicketStatus, Priority, CommentType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clear existing data
  await prisma.ticketStatusHistory.deleteMany();
  await prisma.comments.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.user.deleteMany();
  await prisma.marketCenter.deleteMany();

  // Create Market Center
  const marketCenter = await prisma.marketCenter.create({
    data: {
      id: 'mc_001',
      name: 'Greenville Downtown Market Center',
      code: 'TEST',
      region: 'Southeast',
      timezone: 'America/New_York',
      address1: '123 Main St',
      address2: 'Suite 400',
      city: 'Greenville',
      state: 'SC',
      zip: '29601',
      phone: '704-555-0199',
      email: 'mc-test@example.com',
    },
  });

  // Create Users
  const [user1, user2, user3] = await prisma.$transaction([
    prisma.user.create({
      data: {
        id: 'user_001',
        auth0Id: 'auth0|agent001',
        name: 'Kim Possible',
        role: [Role.AGENT],
        email: 'kpossible@example.com',
        phone: '704-555-0101',
        marketCenterId: marketCenter.id,
      },
    }),
    prisma.user.create({
      data: {
        id: 'user_002',
        auth0Id: 'auth0|admin001',
        name: 'Norville Rodgers',
        role: [Role.ADMIN],
        email: 'norville.rogers@example.com',
        phone: '704-555-0102',
        marketCenterId: marketCenter.id,
      },
    }),
    prisma.user.create({
      data: {
        id: 'user_003',
        auth0Id: 'auth0|compliance001',
        name: 'Bob Belcher',
        role: [Role.STAFF],
        email: 'burgers@example.com',
        phone: '704-555-0103',
        marketCenterId: marketCenter.id,
      },
    }),
  ]);

  // Create Tickets
const [ticket1, ticket2] = await prisma.$transaction([
  prisma.ticket.create({
    data: {
      id: 'ticket_001',
      creatorId: user1.id,
      assigneeId: user2.id,
      marketCenterId: marketCenter.id,
      title: 'Issue uploading buyer documents',
      priority: Priority.HIGH,
      status: TicketStatus.IN_PROGRESS,
      updatedAt: new Date(),
      category: 'Tech',
    },
  }),
  prisma.ticket.create({
    data: {
      id: 'ticket_002',
      creatorId: user1.id,
      assigneeId: user3.id,
      marketCenterId: marketCenter.id,
      title: 'Question about commission disbursement',
      priority: Priority.MEDIUM,
      status: TicketStatus.PENDING,
      updatedAt: new Date(),
      category: 'Payment',
    },
  }),
    prisma.ticket.create({
      data: {
        id: 'ticket_003',
        creatorId: user2.id,
        assigneeId: user3.id,
        marketCenterId: marketCenter.id,
        title: 'Printer out of ink',
        priority:  Priority.LOW,
        status: TicketStatus.CREATED,
        updatedAt: new Date(),
        category: 'Housekeeping',
      },
    }),
]);

  // Create Comments
  await prisma.comments.createMany({
    data: [
      {
        id: 'comment_001',
        userId: user1.id,
        ticketId: ticket1.id,
        type: CommentType.ISSUE,
        content: 'I keep getting an error when I try to upload the contract PDF.',
      },
      {
        id: 'comment_002',
        userId: user2.id,
        ticketId: ticket1.id,
        type: CommentType.NOTE,
        content: 'Checked the logs; seems like a file size limit issue. Looking into it.',
      },
      {
        id: 'comment_003',
        userId: user1.id,
        ticketId: ticket2.id,
        type: CommentType.QUESTION,
        content: 'When should I expect the commission payment for the sale?',
      },
      {
        id: 'comment_004',
        userId: user3.id,
        ticketId: ticket2.id,
        type: CommentType.FOLLOW_UP,
        content: 'Payment should be disbursed by Friday. Waiting on one final signature.',
      },
    ],
  });

  // Create Ticket Status History
  await prisma.ticketStatusHistory.createMany({
    data: [
      {
        id: 'history_001',
        ticketId: ticket1.id,
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
        status: TicketStatus.CREATED,
      },
      {
        id: 'history_002',
        ticketId: ticket1.id,
        updatedAt: new Date(),
        status: TicketStatus.IN_PROGRESS,
      },
      {
        id: 'history_003',
        ticketId: ticket2.id,
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
        status: TicketStatus.CREATED,
      },
      {
        id: 'history_004',
        ticketId: ticket2.id,
        updatedAt: new Date(),
        status: TicketStatus.PENDING,
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
