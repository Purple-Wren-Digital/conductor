import { api, APIError } from "encore.dev/api";
import { canCreateMarketCenters } from "../auth/permissions";
import { getUserContext } from "../auth/user-context";
import {
  db,
  marketCenterRepository,
  withTransaction,
  fromTimestamp,
  toJson,
} from "../ticket/db";
import type { MarketCenter } from "./types";
import type { User } from "../user/types";
import { defaultMarketCenterNotificationPreferences } from "../marketCenters/notification-preferences/utils";
import { notificationTemplatesDefault } from "../notifications/templates/utils";
// TODO: AUTO-CLOSE TICKETS CREATED

export const defaultTicketCategories = [
  { name: "General", description: "General inquiries and support" },
  { name: "Clients", description: "Client-related issues and questions" },
  { name: "Contracts", description: "Contract management and inquiries" },
  { name: "Financial", description: "Billing and payment issues" },
  { name: "Inspections", description: "Inspection scheduling and reports" },
  { name: "Listings", description: "Property listings and updates" },
  { name: "Maintenance", description: "Maintenance requests and tracking" },
  { name: "Onboarding", description: "New client onboarding and setup" },
  { name: "Showings", description: "Property showing appointments" },
  {
    name: "Technical Support",
    description: "Technical issues and troubleshooting",
  },
];

export interface CreateMarketCenterRequest {
  name: string;
  users?: User[];
  ticketCategories?: { name: string; description: string }[];
  // TODO:
  // settings:
  // settingsAuditLogs?: SettingsAuditLog[];
  // teamInvitations:
}

export interface CreateMarketCenterResponse {
  marketCenter: MarketCenter;
}

export const create = api<
  CreateMarketCenterRequest,
  CreateMarketCenterResponse
>(
  {
    expose: true,
    method: "POST",
    path: "/marketCenters/create",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();

    const canCreate = await canCreateMarketCenters(userContext);

    if (!canCreate) {
      throw APIError.permissionDenied(
        "Only Admin users under the Enterprise subscription can create market centers"
      );
    }

    const result = await withTransaction(async (tx) => {
      // Create market center
      const marketCenterRow = await tx.queryRow<{
        id: string;
        name: string;
        settings: any;
        created_at: Date;
        updated_at: Date;
      }>`
        INSERT INTO market_centers (id, name, settings, created_at, updated_at)
        VALUES (gen_random_uuid()::text, ${req.name}, ${toJson({})}::jsonb, NOW(), NOW())
        RETURNING id, name, settings, created_at, updated_at
      `;

      if (!marketCenterRow) {
        throw APIError.internal("Failed to create market center");
      }

      // Associate users with market center
      if (req?.users !== undefined && req?.users.length > 0) {
        for (const user of req.users) {
          await tx.exec`
            UPDATE users
            SET market_center_id = ${marketCenterRow.id}, updated_at = NOW()
            WHERE id = ${user.id}
          `;
        }
      }

      // Create history entry
      await tx.exec`
        INSERT INTO market_center_history (
          id, market_center_id, action, snapshot, changed_at, changed_by_id
        ) VALUES (
          gen_random_uuid()::text,
          ${marketCenterRow.id},
          'CREATE',
          ${toJson({})}::jsonb,
          NOW(),
          ${userContext.userId}
        )
      `;

      // Fetch users associated with the market center
      const userRows = await tx.queryAll<{
        id: string;
        email: string;
        name: string | null;
        role: string;
        clerk_id: string;
        is_active: boolean;
        market_center_id: string | null;
        created_at: Date;
        updated_at: Date;
      }>`
        SELECT id, email, name, role, clerk_id, is_active, market_center_id, created_at, updated_at
        FROM users
        WHERE market_center_id = ${marketCenterRow.id} AND is_active = true
      `;

      const marketCenter: MarketCenter = {
        id: marketCenterRow.id,
        name: marketCenterRow.name,
        settings: marketCenterRow.settings,
        createdAt: fromTimestamp(marketCenterRow.created_at)!,
        updatedAt: fromTimestamp(marketCenterRow.updated_at)!,
        users: userRows.map((u) => ({
          id: u.id,
          email: u.email,
          name: u.name ?? "",
          role: u.role as any,
          clerkId: u.clerk_id,
          isActive: u.is_active,
          marketCenterId: u.market_center_id ?? null,
          createdAt: fromTimestamp(u.created_at)!,
          updatedAt: fromTimestamp(u.updated_at)!,
        })),
      };
      // Default Settings
      const settings = await marketCenterRepository.update(marketCenterRow.id, {
        ...marketCenterRow.settings,
        notificationPreferences: defaultMarketCenterNotificationPreferences,
      });

      // Default InApp Notification Templates
      for (const template of notificationTemplatesDefault) {
        await tx.exec`
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
            ${marketCenterRow.id}
          )
        `;
      }

      let staffId: string | null = null;
      if (req?.users && req.users.length > 0) {
        const staffLeader = req.users.find((u) => u.role === "STAFF_LEADER");
        if (staffLeader && staffLeader?.id) {
          staffId = staffLeader.id;
        }
        if (!staffLeader || !staffLeader?.id || !staffId) {
          const staff = req.users.find((u) => u.role === "STAFF");
          if (staff && staff?.id) {
            staffId = staff.id;
          }
        }
      }

      const ticketCategoriesToCreate =
        req?.ticketCategories && req?.ticketCategories.length > 0
          ? [...req.ticketCategories].flat()
          : defaultTicketCategories;

      for (const category of ticketCategoriesToCreate) {
        await tx.exec`
          INSERT INTO ticket_categories (
            id, name, description, market_center_id, created_at, updated_at, default_assignee_id
          ) VALUES (
            gen_random_uuid()::text,
            ${category.name},
            ${category.description || ""},
            ${marketCenterRow.id},
            NOW(),
            NOW(),
            ${staffId}
          )
        `;
      }

      return { marketCenter };
    });

    return { marketCenter: result.marketCenter };
  }
);
