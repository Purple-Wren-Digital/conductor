import { api } from "encore.dev/api";
import { prisma } from "../ticket/db";
import type { Prisma, Ticket, User } from "@prisma/client";
import { TicketStatus, Urgency, UserRole } from "@prisma/client";

export interface SeedResponse {
  message: string;
}

const rand = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const subDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() - n);

export const seedData = api<void, SeedResponse>(
  { expose: true, method: "POST", path: "/seed" },
  async () => {
    console.log("Seeding database...");

    await prisma.comment.deleteMany({});
    await prisma.ticket.deleteMany({});
    await prisma.user.deleteMany({});

    const users = await prisma.user.createManyAndReturn({
      data: [
        { id: "u1", email: "alice.agent@kw.com", name: "Alice Johnson", role: UserRole.AGENT },
        { id: "u2", email: "bob.staff@kw.com", name: "Bob Smith", role: UserRole.STAFF },
        { id: "u3", email: "clara.admin@kw.com", name: "Clara Davis", role: UserRole.ADMIN },
        { id: "u4", email: "dan.agent@kw.com", name: "Dan Williams", role: UserRole.AGENT },
        { id: "u5", email: "emma.staff@kw.com", name: "Emma Brown", role: UserRole.STAFF },
        { id: "u6", email: "frank.agent@kw.com", name: "Frank Miller", role: UserRole.AGENT },
        { id: "u7", email: "gina.staff@kw.com", name: "Gina Wilson", role: UserRole.STAFF },
        { id: "u8", email: "henry.agent@kw.com", name: "Henry Clark", role: UserRole.AGENT },
        { id: "u9", email: "isla.staff@kw.com", name: "Isla Martinez", role: UserRole.STAFF },
        { id: "u10", email: "jack.agent@kw.com", name: "Jack Lee", role: UserRole.AGENT },
      ],
    });

    const agents = users.filter(u => u.role === UserRole.AGENT);
    const staff = users.filter(u => u.role === UserRole.STAFF);
    const admin = users.find(u => u.role === UserRole.ADMIN)!;
    const now = new Date();

    const templates: Array<
      Omit<Prisma.TicketCreateManyInput, "creatorId" | "assigneeId"> & {
        dueDate?: Date | null;
        resolvedAt?: Date | null;
      }
    > = [
      {
        title: "Contract deadline for 123 Maple St",
        description: "Financing contingency expires tomorrow, awaiting appraisal report.",
        status: TicketStatus.IN_PROGRESS,
        urgency: Urgency.HIGH,
        category: "Contracts",
        createdAt: subDays(now, 2),
        dueDate: addDays(now, 1),
      },
      {
        title: "Showing feedback for 456 Oak Ave",
        description: "Client viewed property; need follow-up on feedback.",
        status: TicketStatus.AWAITING_RESPONSE,
        urgency: Urgency.MEDIUM,
        category: "Client Follow-up",
        createdAt: subDays(now, 3),
        dueDate: subDays(now, 1),
      },
      {
        title: "Listing photos for 789 Pine Ln",
        description: "Photos completed and ready for MLS upload.",
        status: TicketStatus.RESOLVED,
        urgency: Urgency.MEDIUM,
        category: "Listings",
        createdAt: subDays(now, 10),
        resolvedAt: subDays(now, 8),
      },
      {
        title: "School ratings feature request",
        description: "Integrate school rating system into listings.",
        status: TicketStatus.ASSIGNED,
        urgency: Urgency.LOW,
        category: "Feature Request",
        createdAt: subDays(now, 5),
      },
      {
        title: "Client complaint about agent",
        description: "Mr. Smith reports unresponsive agent on inspection issue.",
        status: TicketStatus.IN_PROGRESS,
        urgency: Urgency.HIGH,
        category: "Client Relations",
        createdAt: subDays(now, 1),
        dueDate: addDays(now, 2),
      },
      {
        title: "Schedule pest inspection for 333 Birch Rd",
        description: "Agreement requires pest inspection within 5 days.",
        status: TicketStatus.ASSIGNED,
        urgency: Urgency.MEDIUM,
        category: "Inspections",
        createdAt: subDays(now, 2),
        dueDate: addDays(now, 3),
      },
      {
        title: "Document Request: HOA bylaws",
        description: "Buyer for 555 Cedar Ct requested HOA bylaws and statements.",
        status: TicketStatus.AWAITING_RESPONSE,
        urgency: Urgency.LOW,
        category: "Documents",
        createdAt: subDays(now, 3),
      },
      {
        title: "Price reduction update for 999 Spruce Ave",
        description: "Update MLS from $450,000 to $435,000.",
        status: TicketStatus.RESOLVED,
        urgency: Urgency.MEDIUM,
        category: "Listings",
        createdAt: subDays(now, 15),
        resolvedAt: subDays(now, 14),
      },
      {
        title: "Repair: Leaky faucet at 111 Willow Way",
        description: "Tenant reports leak in master bathroom faucet.",
        status: TicketStatus.ASSIGNED,
        urgency: Urgency.MEDIUM,
        category: "Maintenance",
        createdAt: subDays(now, 1),
      },
      {
        title: "Commission split clarification",
        description: "Clarify co-agent commission split for 888 Redwood Dr.",
        status: TicketStatus.AWAITING_RESPONSE,
        urgency: Urgency.LOW,
        category: "Financial",
        createdAt: subDays(now, 6),
      },
      {
        title: "Marketing for Open House at 777 Magnolia Blvd",
        description: "Need flyers, social posts, and email blast.",
        status: TicketStatus.IN_PROGRESS,
        urgency: Urgency.HIGH,
        category: "Marketing",
        createdAt: subDays(now, 3),
        dueDate: addDays(now, 2),
      },
      {
        title: "Compliance check: Advertising copy",
        description: "Review 'Find Your Dream Home' campaign for compliance.",
        status: TicketStatus.ASSIGNED,
        urgency: Urgency.MEDIUM,
        category: "Compliance",
        createdAt: subDays(now, 4),
      },
      {
        title: "Onboard new agent Sarah Jenkins",
        description: "Prepare welcome kit, access, and training schedule.",
        status: TicketStatus.ASSIGNED,
        urgency: Urgency.MEDIUM,
        category: "Onboarding",
        createdAt: subDays(now, 2),
        dueDate: addDays(now, 4),
      },
      {
        title: "System Error: Cannot upload documents",
        description: "Agents report 500 error when uploading PDFs.",
        status: TicketStatus.IN_PROGRESS,
        urgency: Urgency.HIGH,
        category: "Technical",
        createdAt: now,
      },
      {
        title: "Update website with sold properties",
        description: "Mark Main, Broad, and Church properties as sold.",
        status: TicketStatus.RESOLVED,
        urgency: Urgency.LOW,
        category: "Website",
        createdAt: subDays(now, 20),
        resolvedAt: subDays(now, 18),
      },
      {
        title: "Schedule appraisal for 222 Elm St",
        description: "Appraisal needed within 7 days per lender.",
        status: TicketStatus.ASSIGNED,
        urgency: Urgency.MEDIUM,
        category: "Appraisals",
        createdAt: subDays(now, 1),
        dueDate: addDays(now, 7),
      },
      {
        title: "Client question about loan options",
        description: "Provide breakdown of FHA vs Conventional.",
        status: TicketStatus.AWAITING_RESPONSE,
        urgency: Urgency.LOW,
        category: "Finance",
        createdAt: subDays(now, 2),
      },
      {
        title: "Inspection results review",
        description: "Review inspection report with client for 101 Maple St.",
        status: TicketStatus.IN_PROGRESS,
        urgency: Urgency.MEDIUM,
        category: "Inspections",
        createdAt: subDays(now, 1),
      },
      {
        title: "Request for virtual staging photos",
        description: "Client wants virtual staging before MLS listing.",
        status: TicketStatus.ASSIGNED,
        urgency: Urgency.LOW,
        category: "Listings",
        createdAt: subDays(now, 3),
      },
      {
        title: "Annual compliance training reminder",
        description: "Ensure all agents complete compliance training.",
        status: TicketStatus.ASSIGNED,
        urgency: Urgency.MEDIUM,
        category: "Compliance",
        createdAt: now,
        dueDate: addDays(now, 10),
      },
    ];

    const ticketsToCreate: Prisma.TicketCreateManyInput[] = templates.map(t => {
      const base: Prisma.TicketCreateManyInput = {
        title: t.title,
        description: t.description,
        status: t.status,
        urgency: t.urgency,
        category: t.category,
        creatorId: rand(agents).id,
        assigneeId: rand(staff).id, 
        createdAt: t.createdAt,
        dueDate: t.dueDate ?? null,
        resolvedAt: t.status === TicketStatus.RESOLVED ? (t.resolvedAt ?? subDays(now, 1)) : null,
      };
      return base;
    });

    const tickets = await prisma.ticket.createManyAndReturn({ data: ticketsToCreate });

    const comments: Prisma.CommentCreateManyInput[] = [];
    for (const ticket of tickets) {
      comments.push(
        {
          ticketId: ticket.id,
          userId: ticket.assigneeId ?? rand(staff).id,
          content: `Initial update on "${ticket.title}".`,
          internal: false,
          createdAt: subDays(now, 1),
        },
        {
          ticketId: ticket.id,
          userId: ticket.creatorId,
          content: `Follow-up for "${ticket.title}". Progress noted.`,
          internal: false,
          createdAt: now,
        }
      );
      if (Math.random() > 0.6) {
        comments.push({
          ticketId: ticket.id,
          userId: admin.id,
          content: `Internal note by admin for "${ticket.title}".`,
          internal: true,
          createdAt: now,
        });
      }
    }

    await prisma.comment.createMany({ data: comments });

    console.log("Seed completed.");
    return { message: "Seeded 10 users, 20 varied tickets, each with ≥2 comments." };
  }
);
