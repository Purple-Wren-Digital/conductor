import { api } from "encore.dev/api";
import {
  db,
  userRepository,
  ticketRepository,
  commentRepository,
  notificationRepository,
  marketCenterRepository,
  surveyRepository,
} from "../ticket/db";
import { notificationTemplatesDefault } from "../notifications/templates/utils";
import { defaultNotificationPreferences } from "../utils";
import { ticket } from "~encore/clients";
// TODO: Notification templates for each market center

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

    // Clean up in correct order using raw SQL
    // Use correct table names matching the migration schema
    await db.exec`DELETE FROM ticket_history`;
    await db.exec`DELETE FROM comments`;
    await db.exec`DELETE FROM attachments`;
    await db.exec`DELETE FROM todos`;
    await db.exec`UPDATE tickets SET assignee_id = NULL`;
    await db.exec`DELETE FROM ticket_ratings`;
    await db.exec`DELETE FROM tickets`;

    await db.exec`DELETE FROM notifications`;
    await db.exec`DELETE FROM notification_preferences`;
    await db.exec`DELETE FROM notification_templates`;

    await db.exec`DELETE FROM ticket_categories`;

    await db.exec`DELETE FROM user_history`;
    await db.exec`DELETE FROM user_settings`;

    await db.exec`DELETE FROM market_center_history`;

    // Delete subscriptions before market centers (foreign key)
    await db.exec`DELETE FROM subscription_invoices`;
    await db.exec`DELETE FROM subscription_usage`;
    await db.exec`DELETE FROM subscriptions`;

    // Delete parent records last
    await db.exec`DELETE FROM users WHERE email != 'vmcnorrill@gmail.com'`;
    await db.exec`DELETE FROM market_centers`;

    const now = new Date();

    // 3-5 Market Centers
    const mc = await db.queryAll<{ id: string; name: string }>`
      INSERT INTO market_centers (id, name, created_at, updated_at)
      VALUES
        (gen_random_uuid()::text, 'Downtown Greenville', NOW(), NOW()),
        (gen_random_uuid()::text, 'Simpsonville', NOW(), NOW()),
        (gen_random_uuid()::text, 'Travelers Rest', NOW(), NOW())
      RETURNING id, name
    `;

    // Create active subscriptions, notification preferences,
    // and notification templates for each market center
    for (const marketCenter of mc) {
      // Create subscription
      await db.exec`
        INSERT INTO subscriptions (
          id, stripe_subscription_id, stripe_customer_id, market_center_id,
          status, plan_type, price_id, included_seats, additional_seats,
          seat_price, current_period_start, current_period_end, features,
          created_at, updated_at
        )
        VALUES (
          gen_random_uuid()::text,
          ${"sub_seed_" + marketCenter.id.substring(0, 8)},
          ${"cus_seed_" + marketCenter.id.substring(0, 8)},
          ${marketCenter.id},
          'ACTIVE',
          'TEAM',
          'price_seed_team',
          5,
          0,
          10.00,
          NOW(),
          NOW() + INTERVAL '1 year',
          '{"sla": true, "apiAccess": false}'::jsonb,
          NOW(),
          NOW()
        )
      `;
      // Update market center with settings and notification preferences
      await db.exec`
        UPDATE market_centers
        SET settings = ${JSON.stringify({
          notificationPreferences: defaultNotificationPreferences,
        })}::jsonb
        WHERE id = ${marketCenter.id}
      `;
      // Create notification templates for this market center
      for (const template of notificationTemplatesDefault) {
        await db.exec`
      INSERT INTO notification_templates (
        id,
        template_name,
        template_description,
        category,
        channel,
        type,
        subject,
        body,
        is_default,
        created_at,
        variables,
        is_active,
        market_center_id
      )
      VALUES (
        gen_random_uuid()::text,
        ${template.templateName},
        ${template.templateDescription ?? ""},
        ${template.category},
        ${template.channel},
        ${template.type},
        ${template.subject ?? ""},
        ${template.body},
        ${template.isDefault ?? true},
        NOW(),
        ${template.variables ?? null}::jsonb,
        ${template.isActive ?? true},
        ${marketCenter.id}
      )
    `;
      }
    }

    // Upsert developer user - create if not exists, update if exists
    // This ensures the local development user always exists with proper access
    const devEmail = "calebmcquaid+1@gmail.com";
    const existingDevUser = await db.queryRow<{ id: string }>`
      SELECT id FROM users WHERE email = ${devEmail}
    `;

    if (existingDevUser) {
      // Update existing user to have ADMIN role and first market center
      await db.exec`
        UPDATE users
        SET market_center_id = ${mc[0]?.id}, role = 'ADMIN', updated_at = NOW()
        WHERE email = ${devEmail}
      `;
      console.log(`Updated existing dev user: ${devEmail}`);
    } else {
      // Create the dev user with ADMIN role
      await db.exec`
        INSERT INTO users (id, email, name, role, clerk_id, market_center_id, is_active, created_at, updated_at)
        VALUES (
          gen_random_uuid()::text,
          ${devEmail},
          'Caleb McQuaid',
          'ADMIN',
          'dev-user-clerk-id',
          ${mc[0]?.id},
          true,
          NOW(),
          NOW()
        )
      `;
      console.log(`Created dev user: ${devEmail}`);
    }

    // Update any other existing users without market center to be ADMIN of the first market center
    await db.exec`
      UPDATE users
      SET market_center_id = ${mc[0]?.id}, role = 'ADMIN'
      WHERE market_center_id IS NULL AND email != ${devEmail}
    `;

    const createdUsers = await db.queryAll<{
      id: string;
      email: string;
      name: string;
      role: string;
      clerk_id: string;
      market_center_id: string | null;
    }>`
      INSERT INTO users (id, email, name, role, clerk_id, market_center_id, created_at, updated_at)
      VALUES
        (gen_random_uuid()::text, 'alice.agent@kw.com', 'Alice Johnson', 'STAFF_LEADER', 'seed-01', ${mc[0]?.id}, NOW(), NOW()),
        (gen_random_uuid()::text, 'bob.staff@kw.com', 'Bob Smith', 'STAFF', 'seed-02', ${mc[0]?.id}, NOW(), NOW()),
        (gen_random_uuid()::text, 'clara.admin@kw.com', 'Clara Davis', 'ADMIN', 'seed-03', NULL, NOW(), NOW()),
        (gen_random_uuid()::text, 'dan.agent@kw.com', 'Dan Williams', 'AGENT', 'seed-04', ${mc[1]?.id}, NOW(), NOW()),
        (gen_random_uuid()::text, 'emma.staff@kw.com', 'Emma Brown', 'STAFF', 'seed-05', ${mc[1]?.id}, NOW(), NOW()),
        (gen_random_uuid()::text, 'frank.agent@kw.com', 'Frank Miller', 'STAFF_LEADER', 'seed-06', ${mc[1]?.id}, NOW(), NOW()),
        (gen_random_uuid()::text, 'gina.staff@kw.com', 'Gina Wilson', 'STAFF', 'seed-07', ${mc[1]?.id}, NOW(), NOW()),
        (gen_random_uuid()::text, 'henry.agent@kw.com', 'Henry Clark', 'STAFF', 'seed-08', ${mc[2]?.id}, NOW(), NOW()),
        (gen_random_uuid()::text, 'isla.staff@kw.com', 'Isla Martinez', 'AGENT', 'seed-09', ${mc[2]?.id}, NOW(), NOW()),
        (gen_random_uuid()::text, 'jack.agent@kw.com', 'Jack Lee', 'STAFF_LEADER', 'seed-10', ${mc[2]?.id}, NOW(), NOW()),
        (gen_random_uuid()::text, 'kathryn.hann@kw.com', 'Kathryn Hann', 'STAFF', 'seed-11', NULL, NOW(), NOW()),
        (gen_random_uuid()::text, 'lawrence.david@kw.com', 'Larry David', 'STAFF', 'seed-12', ${mc[2]?.id}, NOW(), NOW()),
        (gen_random_uuid()::text, 'm.organa@kw.com', 'Morgan Organa', 'STAFF', 'seed-13', NULL, NOW(), NOW()),
        (gen_random_uuid()::text, 'nathan.lane@kw.com', 'Nathan Agent', 'AGENT', 'seed-14', ${mc[0]?.id}, NOW(), NOW())
      RETURNING id, email, name, role, clerk_id, market_center_id
    `;

    const agents = createdUsers.filter((u) => u.role === "AGENT");
    const staff = createdUsers.filter(
      (u) => u.role === "STAFF" || u.role === "STAFF_LEADER"
    )!;
    const admin = createdUsers.find((u) => u.role === "ADMIN")!;

    // Create user settings and notifications for each user
    for (const user of createdUsers) {
      // Create user settings with notification preferences
      const userSettingsId = (
        await db.queryRow<{ id: string }>`
        INSERT INTO user_settings (id, user_id, created_at, updated_at)
        VALUES (gen_random_uuid()::text, ${user.id}, NOW(), NOW())
        RETURNING id
      `
      )?.id;

      if (userSettingsId) {
        // Create notification preferences
        await db.exec`
          INSERT INTO notification_preferences (
            id, user_settings_id, type, email, push, in_app, category, frequency, sms
          )
          VALUES (
            gen_random_uuid()::text, ${userSettingsId}, 'default', true, true,
            true, 'ACCOUNT', 'INSTANT', false
          )
        `;
      }

      // Create welcome notification
      await db.exec`
        INSERT INTO notifications (
          id, user_id, channel, category, priority, type, title, body,
          delivered_at, created_at
        )
        VALUES (
          gen_random_uuid()::text, ${user.id}, 'IN_APP', 'ACCOUNT', 'HIGH',
          'General', 'Welcome to Conductor',
          ${"Hello " + user.name + ", we're excited to have you on board."},
          NOW(), NOW()
        )
      `;
    }

    // Create ticket categories
    const categoryNames = [
      { name: "Appraisals", marketCenterIds: mc.map((m) => m.id) },
      { name: "Compliance", marketCenterIds: mc.map((m) => m.id) },
      { name: "Contracts", marketCenterIds: mc.map((m) => m.id) },
      { name: "Documents", marketCenterIds: mc.map((m) => m.id) },
      { name: "Financial", marketCenterIds: mc.map((m) => m.id) },
      { name: "Inspections", marketCenterIds: mc.map((m) => m.id) },
      { name: "Listings", marketCenterIds: mc.map((m) => m.id) },
      { name: "Maintenance", marketCenterIds: mc.map((m) => m.id) },
      { name: "Marketing", marketCenterIds: mc.map((m) => m.id) },
      { name: "Onboarding", marketCenterIds: mc.map((m) => m.id) },
      { name: "Showing Request", marketCenterIds: mc.map((m) => m.id) },
    ];

    const categories: {
      id: string;
      name: string;
      market_center_id: string;
      default_assignee_id: string | null;
    }[] = [];

    for (const category of categoryNames) {
      for (const mcId of category.marketCenterIds) {
        const staffInMC = staff.filter((s) => s.market_center_id === mcId);
        const defaultAssignee = rand(staffInMC);

        const cat = await db.queryRow<{
          id: string;
          name: string;
          market_center_id: string;
          default_assignee_id: string | null;
        }>`
          INSERT INTO ticket_categories (id, name, market_center_id, default_assignee_id, created_at, updated_at)
          VALUES (gen_random_uuid()::text, ${category.name}, ${mcId}, ${defaultAssignee?.id || null}, NOW(), NOW())
          RETURNING id, name, market_center_id, default_assignee_id
        `;

        if (cat) {
          categories.push(cat);
        }
      }
    }

    const categoryMap: Record<
      string,
      {
        id: string;
        default_assignee_id?: string | null;
        market_center_id: string;
      }[]
    > = categories.reduce<
      Record<
        string,
        {
          id: string;
          default_assignee_id: string | null;
          market_center_id: string;
        }[]
      >
    >((acc, category) => {
      if (!acc[category.name]) {
        acc[category.name] = [];
      }
      acc[category.name].push({
        id: category.id,
        default_assignee_id: category.default_assignee_id,
        market_center_id: category.market_center_id,
      });
      return acc;
    }, {});

    const templates: Array<{
      title: string;
      description: string;
      status: string;
      urgency: string;
      createdAt: Date;
      dueDate?: Date | null;
      resolvedAt?: Date | null;
      categoryName: string;
      marketCenterId?: string;
    }> = [
      {
        title: "Contract deadline for 123 Maple St",
        description:
          "Financing contingency expires tomorrow, awaiting appraisal report",
        status: "AWAITING_RESPONSE",
        urgency: "HIGH",
        createdAt: subDays(now, 2),
        dueDate: addDays(now, 1),
        categoryName: "Contracts",
        marketCenterId: mc[0]?.id,
      },
      {
        title: "Showing feedback for 456 Oak Ave",
        description: "Client viewed property; need follow-up on feedback",
        status: "AWAITING_RESPONSE",
        urgency: "MEDIUM",
        categoryName: "Showing Request",
        marketCenterId: mc[0]?.id,
        createdAt: subDays(now, 3),
        dueDate: subDays(now, 1),
      },
      {
        title: "Listing photos for 789 Pine Ln",
        description: "Photos completed and ready for MLS upload",
        status: "RESOLVED",
        urgency: "MEDIUM",
        categoryName: "Listings",
        marketCenterId: mc[0]?.id,
        createdAt: subDays(now, 10),
        resolvedAt: subDays(now, 8),
      },
      {
        title: "Client complaint about agent",
        description: "Mr. Smith reports unresponsive agent on inspection issue",
        status: "AWAITING_RESPONSE",
        urgency: "HIGH",
        categoryName: "Compliance",
        marketCenterId: mc[0]?.id,
        createdAt: subDays(now, 1),
        dueDate: addDays(now, 2),
      },
      {
        title: "Schedule pest inspection for 333 Birch Rd",
        description: "Agreement requires pest inspection within 5 days",
        status: "ASSIGNED",
        urgency: "MEDIUM",
        categoryName: "Inspections",
        marketCenterId: mc[1]?.id,
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
        marketCenterId: mc[1]?.id,
        createdAt: subDays(now, 3),
        dueDate: addDays(now, 4),
      },
      {
        title: "Price reduction update for 999 Spruce Ave",
        description: "Update MLS from $450,000 to $435,000",
        status: "RESOLVED",
        urgency: "MEDIUM",
        categoryName: "Listings",
        marketCenterId: mc[1]?.id,
        createdAt: subDays(now, 15),
        resolvedAt: subDays(now, 14),
      },
      {
        title: "Repair: Leaky faucet at 111 Willow Way",
        description: "Tenant reports leak in master bathroom faucet",
        status: "ASSIGNED",
        urgency: "MEDIUM",
        categoryName: "Maintenance",
        marketCenterId: mc[1]?.id,
        createdAt: subDays(now, 1),
      },
      {
        title: "Commission split clarification",
        description: "Clarify co-agent commission split for 888 Redwood Dr",
        status: "AWAITING_RESPONSE",
        urgency: "LOW",
        categoryName: "Financial",
        marketCenterId: mc[1]?.id,
        createdAt: subDays(now, 6),
      },
      {
        title: "Marketing for Open House at 777 Magnolia Blvd",
        description: "Need flyers, social posts, and email blast",
        status: "RESOLVED",
        urgency: "HIGH",
        categoryName: "Marketing",
        marketCenterId: mc[2]?.id,
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
        marketCenterId: mc[2]?.id,
        createdAt: subDays(now, 4),
      },
      {
        title: "Onboard new agent Sarah Jenkins",
        description: "Prepare welcome kit, access, and training schedule",
        status: "ASSIGNED",
        urgency: "MEDIUM",
        categoryName: "Onboarding",
        marketCenterId: mc[2]?.id,
        createdAt: subDays(now, 2),
        dueDate: addDays(now, 5),
      },
      {
        title: "Update website with sold properties",
        description: "Mark Main, Broad, and Church properties as sold",
        status: "RESOLVED",
        urgency: "LOW",
        categoryName: "Marketing",
        marketCenterId: mc[2]?.id,
        createdAt: subDays(now, 20),
        resolvedAt: subDays(now, 18),
      },
      {
        title: "Schedule appraisal for 222 Elm St",
        description: "Appraisal needed within 7 days per lender",
        status: "ASSIGNED",
        urgency: "MEDIUM",
        categoryName: "Appraisals",
        marketCenterId: mc[2]?.id,
        createdAt: subDays(now, 1),
        dueDate: addDays(now, 7),
      },
      {
        title: "Client question about loan options",
        description: "Provide breakdown of FHA vs Conventional",
        status: "AWAITING_RESPONSE",
        urgency: "LOW",
        categoryName: "Financial",
        marketCenterId: mc[1]?.id,
        createdAt: subDays(now, 2),
        dueDate: addDays(now, 4),
      },
      {
        title: "Inspection results review",
        description: "Review inspection report with client for 101 Maple St",
        status: "CREATED",
        urgency: "MEDIUM",
        categoryName: "Inspections",
        marketCenterId: mc[0]?.id,
        createdAt: subDays(now, 1),
      },
      {
        title: "Request for virtual staging photos",
        description: "Client wants virtual staging before MLS listing",
        status: "ASSIGNED",
        urgency: "LOW",
        categoryName: "Marketing",
        marketCenterId: mc[2]?.id,
        createdAt: subDays(now, 3),
      },
      {
        title: "Annual compliance training reminder",
        description: "Ensure all agents complete compliance training",
        status: "CREATED",
        urgency: "MEDIUM",
        categoryName: "Compliance",
        marketCenterId: mc[1]?.id,
        createdAt: now,
        dueDate: addDays(now, 10),
      },
    ];

    // Create tickets
    const tickets: {
      id: string;
      title: string;
      status: string;
      creator_id: string;
      assignee_id: string | null;
      resolved_at: Date | null;
      category_id: string;
    }[] = [];

    for (const t of templates) {
      const marketCenterId = rand(mc).id;
      const category =
        categoryMap[t.categoryName]?.find(
          (c) => c.market_center_id === marketCenterId
        ) || categoryMap[t.categoryName][0];
      const agentIdsInMC = agents.filter(
        (a) => a.market_center_id === marketCenterId
      );
      const creatorId = rand(agentIdsInMC)?.id;

      const assigneeId =
        t?.status === "CREATED" || t?.status === "UNASSIGNED"
          ? null
          : category?.default_assignee_id || null;

      const ticket = await db.queryRow<{
        id: string;
        title: string;
        status: string;
        creator_id: string;
        assignee_id: string | null;
        resolved_at: Date | null;
        category_id: string;
      }>`
        INSERT INTO tickets (
          id, title, description, status, urgency, category_id,
          creator_id, assignee_id, created_at, updated_at,
          due_date, resolved_at
        )
        VALUES (
          gen_random_uuid()::text, ${t.title}, ${t.description}, ${t.status},
          ${t.urgency}, ${category.id}, ${creatorId}, ${assigneeId},
          ${t.createdAt}, NOW(), ${t.dueDate || null},
          ${t.status === "RESOLVED" ? (t.resolvedAt ?? subDays(now, 1)) : null}
        )
        RETURNING id, title, status, creator_id, assignee_id, resolved_at, category_id
      `;

      if (ticket) {
        tickets.push(ticket);
      }
    }

    const resolvedTickets = tickets.filter((t) => t.status === "RESOLVED");

    // Create surveys for resolved tickets
    for (const ticket of resolvedTickets) {
      const staffMember = staff.find((s) => s.id === ticket.assignee_id);
      const marketCenterId = staffMember?.market_center_id || mc[0]?.id;

      const overallRating = Math.floor(Math.random() * 5) + 1;
      const assigneeRating = Math.floor(Math.random() * 5) + 1;
      const marketCenterRating = Math.floor(Math.random() * 5) + 1;

      const survey = await db.queryRow<{ id: string }>`
        INSERT INTO ticket_ratings (
          id, ticket_id, surveyor_id, assignee_id, market_center_id,
          overall_rating, assignee_rating, market_center_rating, comment,
          completed, created_at, updated_at
        )
        VALUES (
          gen_random_uuid()::text, ${ticket.id}, ${ticket.creator_id},
          ${ticket.assignee_id}, ${marketCenterId},
          ${overallRating}, ${assigneeRating}, ${marketCenterRating},
          ${'Survey for ticket "' + ticket.title + '"'},
          true, ${ticket.resolved_at!}, ${addDays(ticket.resolved_at!, 1)}
        )
        RETURNING id
      `;

      if (survey) {
        await db.exec`
          UPDATE tickets SET survey_id = ${survey.id} WHERE id = ${ticket.id}
        `;
      }
    }

    // Create comments for tickets
    for (const ticket of tickets) {
      await db.exec`
        INSERT INTO comments (id, ticket_id, user_id, content, internal, created_at, updated_at)
        VALUES (
          gen_random_uuid()::text, ${ticket.id},
          ${ticket.assignee_id ?? ticket.creator_id ?? admin.id},
          ${'Initial update on "' + ticket.title + '"'},
          false, ${subDays(now, 1)}, NOW()
        )
      `;

      await db.exec`
        INSERT INTO comments (id, ticket_id, user_id, content, internal, created_at, updated_at)
        VALUES (
          gen_random_uuid()::text, ${ticket.id}, ${ticket.creator_id},
          ${'Follow-up for "' + ticket.title + '". Progress noted'},
          false, NOW(), NOW()
        )
      `;

      if (Math.random() > 0.6) {
        await db.exec`
          INSERT INTO comments (id, ticket_id, user_id, content, internal, created_at, updated_at)
          VALUES (
            gen_random_uuid()::text, ${ticket.id}, ${admin.id},
            ${'Internal note for "' + ticket.title + '".'},
            true, NOW(), NOW()
          )
        `;
      }
    }

    // Create notification templates
    // for (const template of notificationTemplatesDefault) {
    //   await db.exec`
    //     INSERT INTO notification_templates (
    //       id, template_name, template_description, type, channel, category,
    //       subject, body, is_default,
    //       created_at
    //     )
    //     VALUES (
    //       gen_random_uuid()::text, ${template.templateName}, ${template.templateDescription},
    //       ${template.type}, ${template.channel}, ${template.category},
    //       ${template.subject}, ${template.body}, ${template.isDefault},
    //       NOW()
    //     )
    //   `;
    // }

    // Create attachments for some tickets
    const ticketsWithAttachments = tickets.slice(0, 5);
    for (const ticket of ticketsWithAttachments) {
      const numAttachments = Math.floor(Math.random() * 3) + 1;

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

      for (let i = 0; i < numAttachments; i++) {
        const fileInfo = rand(fileTypes);
        const timestamp = Date.now() + Math.floor(Math.random() * 1000);
        const uploadedBy = rand([...staff, ...agents]).id;

        await db.exec`
          INSERT INTO attachments (
            id, file_name, file_size, mime_type, bucket_key,
            ticket_id, uploaded_by, created_at, updated_at
          )
          VALUES (
            gen_random_uuid()::text, ${fileInfo.name}, ${fileInfo.size},
            ${fileInfo.mimeType},
            ${ticket.id + "/" + timestamp + "_" + fileInfo.name.replace(/[^a-zA-Z0-9.-]/g, "_")},
            ${ticket.id}, ${uploadedBy}, NOW(), NOW()
          )
        `;
      }
    }

    console.log("Seed completed");

    return {
      message:
        "Seeded multiple market centers, users, tickets, categories, comments and attachments",
    };
  }
);
