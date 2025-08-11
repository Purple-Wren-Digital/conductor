import { api } from "encore.dev/api";
import { prisma } from "../ticket/db";

export interface SeedResponse {
  message: string;
}

// Seeds the database with sample data.
export const seedData = api<void, SeedResponse>(
  { expose: true, method: "POST", path: "/seed" },
  async () => {
    // Create sample users
    const users = await Promise.all([
      prisma.user.upsert({
        where: { id: 'user_1' },
        update: {},
        create: {
          id: 'user_1',
          email: 'john.agent@example.com',
          name: 'John Agent',
          role: 'AGENT',
        },
      }),
      prisma.user.upsert({
        where: { id: 'user_2' },
        update: {},
        create: {
          id: 'user_2',
          email: 'jane.staff@example.com',
          name: 'Jane Staff',
          role: 'STAFF',
        },
      }),
      prisma.user.upsert({
        where: { id: 'user_3' },
        update: {},
        create: {
          id: 'user_3',
          email: 'admin@example.com',
          name: 'Admin User',
          role: 'ADMIN',
        },
      }),
      prisma.user.upsert({
        where: { id: 'user_4' },
        update: {},
        create: {
          id: 'user_4',
          email: 'bob.agent@example.com',
          name: 'Bob Agent',
          role: 'AGENT',
        },
      }),
      prisma.user.upsert({
        where: { id: 'user_5' },
        update: {},
        create: {
          id: 'user_5',
          email: 'alice.staff@example.com',
          name: 'Alice Staff',
          role: 'STAFF',
        },
      }),
    ]);

    // Create sample tickets
    const tickets = await Promise.all([
      prisma.ticket.create({
        data: {
          title: 'Login Issues',
          description: 'Users cannot log into the system',
          status: 'IN_PROGRESS',
          urgency: 'HIGH',
          category: 'Technical',
          creatorId: 'user_1',
          assigneeId: 'user_2',
          dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
        },
      }),
      prisma.ticket.create({
        data: {
          title: 'Feature Request: Dark Mode',
          description: 'Please add dark mode to the application',
          status: 'ASSIGNED',
          urgency: 'LOW',
          category: 'Feature Request',
          creatorId: 'user_4',
          assigneeId: 'user_5',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
        },
      }),
      prisma.ticket.create({
        data: {
          title: 'Payment Processing Error',
          description: 'Payment gateway is returning errors',
          status: 'AWAITING_RESPONSE',
          urgency: 'HIGH',
          category: 'Technical',
          creatorId: 'user_1',
          assigneeId: 'user_2',
          dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1 day from now
        },
      }),
      prisma.ticket.create({
        data: {
          title: 'UI Bug in Dashboard',
          description: 'Charts are not displaying correctly',
          status: 'RESOLVED',
          urgency: 'MEDIUM',
          category: 'Bug',
          creatorId: 'user_4',
          assigneeId: 'user_5',
          resolvedAt: new Date(),
        },
      }),
      prisma.ticket.create({
        data: {
          title: 'Account Deletion Request',
          description: 'User wants to delete their account',
          status: 'ASSIGNED',
          urgency: 'MEDIUM',
          category: 'Account',
          creatorId: 'user_1',
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        },
      }),
    ]);

    // Create sample comments
    await Promise.all(
      tickets.slice(0, 3).map(ticket =>
        prisma.comment.create({
          data: {
            content: `This is a sample comment for ticket ${ticket.title}`,
            ticketId: ticket.id,
            userId: 'user_2',
            internal: false,
          },
        })
      )
    );

    return { message: "Database seeded successfully" };
  }
);
