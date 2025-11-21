import { api } from "encore.dev/api";
import { prisma } from "../ticket/db";
import type { Prisma } from "@prisma/client";
import { notificationTemplatesDefault } from "../notifications/templates/utils";
import { defaultNotificationPreferences } from "../utils";

export interface SeedResponse {
  message: string;
}

const rand = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const addDays = (d: Date, n: number) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const subDays = (d: Date, n: number) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate() - n);

export const seedData = api<void, SeedResponse>(
  { expose: true, method: "POST", auth: false, path: "/seed" },
  async () => {
    console.log("Seeding database...");

    // Clean up in correct order (respect foreign key constraints)
    // Delete dependent records first
    await prisma.comment.deleteMany({});
    await prisma.attachment.deleteMany({});
    await prisma.ticketHistory.deleteMany({});
    await prisma.ticket.deleteMany({});

    await prisma.notification.deleteMany({});  // Delete notifications BEFORE users
    await prisma.notificationPreferences.deleteMany({});
    await prisma.notificationTemplate.deleteMany({});

    await prisma.ticketCategory.deleteMany({});
    // await prisma.teamInvitation.deleteMany({});

    await prisma.userHistory.deleteMany({});
    await prisma.userSettings.deleteMany({});

    await prisma.marketCenterHistory.deleteMany({});

    // Delete parent records last
    await prisma.user.deleteMany({});
    await prisma.marketCenter.deleteMany({});

    const now = new Date();

    // 3-5 Market Centers
    const mc = await prisma.marketCenter.createManyAndReturn({
      data: [
        { name: "Downtown Greenville" },
        { name: "Simpsonville" },
        { name: "Travelers Rest" },
      ],
    });

    const createdUsers = await prisma.user.createManyAndReturn({
      data: [
        {
          email: "alice.agent@kw.com",
          name: "Alice Johnson",
          role: "AGENT",
          clerkId: "seed-01",
          marketCenterId: mc[0]?.id,
        },
        {
          email: "bob.staff@kw.com",
          name: "Bob Smith",
          role: "STAFF_LEADER",
          clerkId: "seed-02",
          marketCenterId: mc[0]?.id,
        },
        {
          email: "clara.admin@kw.com",
          name: "Clara Davis",
          role: "ADMIN",
          clerkId: "seed-03",
          marketCenterId: undefined,
        },
        {
          email: "dan.agent@kw.com",
          name: "Dan Williams",
          role: "AGENT",
          clerkId: "seed-04",
          marketCenterId: mc[0]?.id,
        },
        {
          email: "emma.staff@kw.com",
          name: "Emma Brown",
          role: "STAFF",
          clerkId: "seed-05",
          marketCenterId: mc[1]?.id,
        },
        {
          email: "frank.agent@kw.com",
          name: "Frank Miller",
          role: "STAFF",
          clerkId: "seed-06",
          marketCenterId: mc[1]?.id,
        },
        {
          email: "gina.staff@kw.com",
          name: "Gina Wilson",
          role: "STAFF",
          clerkId: "seed-07",
          marketCenterId: mc[1]?.id,
        },
        {
          email: "henry.agent@kw.com",
          name: "Henry Clark",
          role: "STAFF_LEADER",
          clerkId: "seed-08",
          marketCenterId: mc[2]?.id,
        },
        {
          email: "isla.staff@kw.com",
          name: "Isla Martinez",
          role: "STAFF",
          clerkId: "seed-09",
          marketCenterId: mc[2]?.id,
        },
        {
          email: "jack.agent@kw.com",
          name: "Jack Lee",
          role: "STAFF_LEADER",
          clerkId: "seed-10",
          marketCenterId: mc[2]?.id,
        },
        {
          email: "kathryn.hann@kw.com",
          name: "Kathryn Hann",
          role: "ADMIN",
          clerkId: "seed-11",
          marketCenterId: undefined,
        },
        {
          email: "lawrence.david@kw.com",
          name: "Larry David",
          role: "AGENT",
          clerkId: "seed-12",
          marketCenterId: undefined,
        },
        {
          email: "m.organa@kw.com",
          name: "Morgan Organa",
          role: "ADMIN",
          clerkId: "seed-13",
          marketCenterId: undefined,
        },
      ],
    });
    const agents = createdUsers.filter((u) => u.role === "AGENT");
    const staff = createdUsers.filter(
      (u) => u.role === "STAFF" || u.role === "STAFF_LEADER"
    )!;
    const admin = createdUsers.find((u) => u.role === "ADMIN")!;

    // Create User Default settings
    createdUsers.forEach(async (user, index) => {
      await prisma.user.update({
        where: { id: user?.id },
        data: {
          userSettings: {
            create: {
              notificationPreferences: {
                create: defaultNotificationPreferences,
              },
            },
          },
        },
        include: {
          userSettings: true,
        },
      });

      await prisma.notification.create({
        data: {
          userId: user?.id,
          channel: "IN_APP",
          category: "ACCOUNT",
          priority: "HIGH",
          type: "General",
          title: "Welcome to Conductor",
          body: "Hello " + user.name + ", we're excited to have you on board.",
          deliveredAt: new Date(),
        },
      });
    });

    // Create ticket categories
    const categoryNames = [
      "Appraisals",
      "Compliance",
      "Contracts",
      "Documents",
      "Financial",
      "Inspections",
      "Listings",
      "Maintenance",
      "Marketing",
      "Onboarding",
      "Showing Request",
    ];

    const categories = await Promise.all(
      categoryNames.map((name) =>
        prisma.ticketCategory.create({
          data: {
            name,
            marketCenterId: rand(mc).id,
            defaultAssigneeId: rand(agents).id,
          },
        })
      )
    );

    const categoryMap: Record<
      string,
      { id: string; defaultAssigneeId: string | null }
    > = Object.fromEntries(
      categories.map((category) => [
        category.name,
        { id: category.id, defaultAssigneeId: category.defaultAssigneeId },
      ])
    );

    const templates: Array<
      Omit<Prisma.TicketCreateManyInput, "creatorId" | "assigneeId"> & {
        categoryName: string;
        dueDate?: Date | null;
        resolvedAt?: Date | null;
      }
    > = [
      {
        title: "Contract deadline for 123 Maple St",
        description:
          "Financing contingency expires tomorrow, awaiting appraisal report",
        status: "AWAITING_RESPONSE",
        urgency: "HIGH",
        categoryName: "Contracts",
        createdAt: subDays(now, 2),
        dueDate: addDays(now, 1),
      },
      {
        title: "Showing feedback for 456 Oak Ave",
        description: "Client viewed property; need follow-up on feedback",
        status: "AWAITING_RESPONSE",
        urgency: "MEDIUM",
        categoryName: "Showing Request",
        createdAt: subDays(now, 3),
        dueDate: subDays(now, 1),
      },
      {
        title: "Listing photos for 789 Pine Ln",
        description: "Photos completed and ready for MLS upload",
        status: "RESOLVED",
        urgency: "MEDIUM",
        categoryName: "Listings",
        createdAt: subDays(now, 10),
        resolvedAt: subDays(now, 8),
      },
      {
        title: "Client complaint about agent",
        description: "Mr. Smith reports unresponsive agent on inspection issue",
        status: "AWAITING_RESPONSE",
        urgency: "HIGH",
        categoryName: "Compliance",
        createdAt: subDays(now, 1),
        dueDate: addDays(now, 2),
      },
      {
        title: "Schedule pest inspection for 333 Birch Rd",
        description: "Agreement requires pest inspection within 5 days",
        status: "ASSIGNED",
        urgency: "MEDIUM",
        categoryName: "Inspections",
        createdAt: subDays(now, 2),
        dueDate: addDays(now, 3),
      },
      {
        title: "Document Request: HOA bylaws",
        description:
          "Buyer for 555 Cedar Ct requested HOA bylaws and statements",
        status: "AWAITING_RESPONSE",
        urgency: "LOW",
        categoryName: "Documents",
        createdAt: subDays(now, 3),
      },
      {
        title: "Price reduction update for 999 Spruce Ave",
        description: "Update MLS from $450,000 to $435,000",
        status: "RESOLVED",
        urgency: "MEDIUM",
        categoryName: "Listings",
        createdAt: subDays(now, 15),
        resolvedAt: subDays(now, 14),
      },
      {
        title: "Repair: Leaky faucet at 111 Willow Way",
        description: "Tenant reports leak in master bathroom faucet",
        status: "ASSIGNED",
        urgency: "MEDIUM",
        categoryName: "Maintenance",
        createdAt: subDays(now, 1),
      },
      {
        title: "Commission split clarification",
        description: "Clarify co-agent commission split for 888 Redwood Dr",
        status: "AWAITING_RESPONSE",
        urgency: "LOW",
        categoryName: "Financial",
        createdAt: subDays(now, 6),
      },
      {
        title: "Marketing for Open House at 777 Magnolia Blvd",
        description: "Need flyers, social posts, and email blast",
        status: "RESOLVED",
        urgency: "HIGH",
        categoryName: "Marketing",
        createdAt: subDays(now, 3),
        dueDate: addDays(now, 2),
        resolvedAt: addDays(now, 1),
      },
      {
        title: "Compliance check: Advertising copy",
        description: "Review 'Find Your Dream Home' campaign for compliance",
        status: "ASSIGNED",
        urgency: "MEDIUM",
        categoryName: "Compliance",
        createdAt: subDays(now, 4),
      },
      {
        title: "Onboard new agent Sarah Jenkins",
        description: "Prepare welcome kit, access, and training schedule",
        status: "ASSIGNED",
        urgency: "MEDIUM",
        categoryName: "Onboarding",
        createdAt: subDays(now, 2),
        dueDate: addDays(now, 4),
      },
      {
        title: "Update website with sold properties",
        description: "Mark Main, Broad, and Church properties as sold",
        status: "RESOLVED",
        urgency: "LOW",
        categoryName: "Marketing",
        createdAt: subDays(now, 20),
        resolvedAt: subDays(now, 18),
      },
      {
        title: "Schedule appraisal for 222 Elm St",
        description: "Appraisal needed within 7 days per lender",
        status: "ASSIGNED",
        urgency: "MEDIUM",
        categoryName: "Appraisals",
        createdAt: subDays(now, 1),
        dueDate: addDays(now, 7),
      },
      {
        title: "Client question about loan options",
        description: "Provide breakdown of FHA vs Conventional",
        status: "AWAITING_RESPONSE",
        urgency: "LOW",
        categoryName: "Financial",
        createdAt: subDays(now, 2),
      },
      {
        title: "Inspection results review",
        description: "Review inspection report with client for 101 Maple St",
        status: "CREATED",
        urgency: "MEDIUM",
        categoryName: "Inspections",
        createdAt: subDays(now, 1),
      },
      {
        title: "Request for virtual staging photos",
        description: "Client wants virtual staging before MLS listing",
        status: "ASSIGNED",
        urgency: "LOW",
        categoryName: "Listings",
        createdAt: subDays(now, 3),
      },
      {
        title: "Annual compliance training reminder",
        description: "Ensure all agents complete compliance training",
        status: "CREATED",
        urgency: "MEDIUM",
        categoryName: "Compliance",
        createdAt: now,
        dueDate: addDays(now, 10),
      },
    ];

    // Tickets per Market Center: 2-4
    const ticketsToCreate: Prisma.TicketCreateManyInput[] = templates.map(
      (t) => {
        const category = categoryMap[t.categoryName];

        const base: Prisma.TicketCreateManyInput = {
          title: t.title,
          description: t.description,
          status: t.status,
          urgency: t.urgency,
          categoryId: category.id,
          creatorId: rand(agents).id,
          assigneeId:
            t.status === "CREATED"
              ? undefined
              : category?.defaultAssigneeId
                ? category.defaultAssigneeId
                : undefined,

          createdAt: t.createdAt,
          dueDate: t.dueDate ?? null,
          resolvedAt:
            t.status === "RESOLVED" ? (t.resolvedAt ?? subDays(now, 1)) : null,
        };
        return base;
      }
    );

    const tickets = await prisma.ticket.createManyAndReturn({
      data: ticketsToCreate,
    });

    const comments: Prisma.CommentCreateManyInput[] = [];
    for (const ticket of tickets) {
      comments.push(
        {
          ticketId: ticket.id,
          userId: ticket.assigneeId ?? rand(staff).id,
          content: `Initial update on "${ticket.title}"`,
          internal: false,
          createdAt: subDays(now, 1),
        },
        {
          ticketId: ticket.id,
          userId: ticket.creatorId,
          content: `Follow-up for "${ticket.title}". Progress noted`,
          internal: false,
          createdAt: now,
        }
      );
      if (Math.random() > 0.6) {
        comments.push({
          ticketId: ticket.id,
          userId: admin.id,
          content: `Internal note for "${ticket.title}".`,
          internal: true,
          createdAt: now,
        });
      }
    }

    // await prisma.notificationPreferences.createMany({
    //   data: defaultNotificationPreferences,
    // });

    await prisma.notificationTemplate.createMany({
      data: notificationTemplatesDefault,
    });

    await prisma.comment.createMany({ data: comments });

    // Create attachments for some tickets
    const attachments: Prisma.AttachmentCreateManyInput[] = [];

    // Add attachments to the first 5 tickets
    const ticketsWithAttachments = tickets.slice(0, 5);
    for (const ticket of ticketsWithAttachments) {
      // Add 1-3 attachments per ticket
      const numAttachments = Math.floor(Math.random() * 3) + 1;

      for (let i = 0; i < numAttachments; i++) {
        const fileTypes = [
          {
            name: "contract.pdf",
            mimeType: "application/pdf",
            size: 1024 * 256,
          },
          {
            name: "property-photo.jpg",
            mimeType: "image/jpeg",
            size: 1024 * 1024 * 2,
          },
          {
            name: "inspection-report.pdf",
            mimeType: "application/pdf",
            size: 1024 * 512,
          },
          { name: "floorplan.png", mimeType: "image/png", size: 1024 * 800 },
          {
            name: "disclosure.docx",
            mimeType:
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            size: 1024 * 128,
          },
          {
            name: "hoa-bylaws.pdf",
            mimeType: "application/pdf",
            size: 1024 * 384,
          },
          {
            name: "budget.xlsx",
            mimeType:
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            size: 1024 * 96,
          },
        ];

        const fileInfo = rand(fileTypes);
        const timestamp = Date.now() + Math.floor(Math.random() * 1000);

        attachments.push({
          fileName: fileInfo.name,
          fileSize: fileInfo.size,
          mimeType: fileInfo.mimeType,
          bucketKey: `${ticket.id}/${timestamp}_${fileInfo.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`,
          ticketId: ticket.id,
          uploadedBy: rand([...staff, ...agents]).id,
          createdAt: new Date(
            ticket.createdAt.getTime() + Math.random() * 86400000
          ), // Random time after ticket creation
        });
      }
    }

    await prisma.attachment.createMany({ data: attachments });

    console.log("Seed completed");

    return {
      message:
        "🌲 Seeded multiple market centers, users, tickets, categories, comments and attachments",
    };
  }
);
