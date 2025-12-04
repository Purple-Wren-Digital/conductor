/**
 * Market Center Repository - Raw SQL queries for market center operations
 */

import { db, fromTimestamp, toJson, fromJson } from "../../ticket/db";
import type { MarketCenter, TicketCategory, TeamInvitation, InvitationStatus, MarketCenterHistory } from "../../marketCenters/types";
import type { User, UserRole } from "../../user/types";

// Database row types
interface MarketCenterRow {
  id: string;
  name: string;
  settings: any;
  created_at: Date;
  updated_at: Date;
}

interface TicketCategoryRow {
  id: string;
  name: string;
  description: string | null;
  market_center_id: string;
  default_assignee_id: string | null;
  created_at: Date;
  updated_at: Date;
}

interface TeamInvitationRow {
  id: string;
  email: string;
  role: UserRole;
  status: InvitationStatus;
  market_center_id: string | null;
  invited_by: string | null;
  token: string;
  expires_at: Date;
  accepted_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

function rowToMarketCenter(row: MarketCenterRow): MarketCenter {
  return {
    id: row.id,
    name: row.name,
    settings: fromJson(row.settings),
    createdAt: fromTimestamp(row.created_at)!,
    updatedAt: fromTimestamp(row.updated_at)!,
  };
}

function rowToCategory(row: TicketCategoryRow): TicketCategory {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    marketCenterId: row.market_center_id,
    defaultAssigneeId: row.default_assignee_id,
    createdAt: fromTimestamp(row.created_at)!,
    updatedAt: fromTimestamp(row.updated_at)!,
  };
}

function rowToInvitation(row: TeamInvitationRow): TeamInvitation {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    status: row.status,
    marketCenterId: row.market_center_id ?? undefined,
    invitedBy: row.invited_by ?? undefined,
    token: row.token,
    expiresAt: fromTimestamp(row.expires_at)!,
    acceptedAt: row.accepted_at ? fromTimestamp(row.accepted_at)! : undefined,
    createdAt: fromTimestamp(row.created_at)!,
    updatedAt: fromTimestamp(row.updated_at)!,
  };
}

export const marketCenterRepository = {
  // Find market center by ID
  async findById(id: string): Promise<MarketCenter | null> {
    const row = await db.queryRow<MarketCenterRow>`
      SELECT * FROM market_centers WHERE id = ${id}
    `;
    return row ? rowToMarketCenter(row) : null;
  },

  // Find market center with users
  async findByIdWithUsers(id: string): Promise<MarketCenter | null> {
    const row = await db.queryRow<MarketCenterRow>`
      SELECT * FROM market_centers WHERE id = ${id}
    `;

    if (!row) return null;

    const marketCenter = rowToMarketCenter(row);

    const userRows = await db.queryAll<{
      id: string;
      email: string;
      name: string | null;
      role: UserRole;
      clerk_id: string;
      is_active: boolean;
      market_center_id: string | null;
      created_at: Date;
      updated_at: Date;
    }>`
      SELECT * FROM users WHERE market_center_id = ${id} AND is_active = true
    `;

    marketCenter.users = userRows.map(u => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      clerkId: u.clerk_id,
      isActive: u.is_active,
      marketCenterId: u.market_center_id,
      createdAt: fromTimestamp(u.created_at)!,
      updatedAt: fromTimestamp(u.updated_at)!,
    }));

    return marketCenter;
  },

  // Find all market centers
  async findAll(): Promise<MarketCenter[]> {
    const rows = await db.queryAll<MarketCenterRow>`
      SELECT * FROM market_centers ORDER BY name ASC
    `;
    return rows.map(rowToMarketCenter);
  },

  // Create market center
  async create(data: { name: string; settings?: any }): Promise<MarketCenter> {
    const row = await db.queryRow<MarketCenterRow>`
      INSERT INTO market_centers (name, settings, created_at, updated_at)
      VALUES (${data.name}, ${toJson(data.settings ?? {})}::jsonb, NOW(), NOW())
      RETURNING *
    `;
    return rowToMarketCenter(row!);
  },

  // Update market center
  async update(id: string, data: Partial<{ name: string; settings: any }>): Promise<MarketCenter | null> {
    const updates: string[] = ['updated_at = NOW()'];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }
    if (data.settings !== undefined) {
      updates.push(`settings = $${paramIndex++}::jsonb`);
      values.push(toJson(data.settings));
    }

    values.push(id);

    const sql = `
      UPDATE market_centers
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const row = await db.rawQueryRow<MarketCenterRow>(sql, ...values);
    return row ? rowToMarketCenter(row) : null;
  },

  // Ticket Category operations
  async findCategoryById(id: string): Promise<TicketCategory | null> {
    const row = await db.queryRow<TicketCategoryRow>`
      SELECT * FROM ticket_categories WHERE id = ${id}
    `;
    return row ? rowToCategory(row) : null;
  },

  async findCategoriesByMarketCenterId(marketCenterId: string): Promise<TicketCategory[]> {
    const rows = await db.queryAll<TicketCategoryRow>`
      SELECT * FROM ticket_categories
      WHERE market_center_id = ${marketCenterId}
      ORDER BY name ASC
    `;
    return rows.map(rowToCategory);
  },

  async createCategory(data: {
    name: string;
    description?: string | null;
    marketCenterId: string;
    defaultAssigneeId?: string | null;
  }): Promise<TicketCategory> {
    const row = await db.queryRow<TicketCategoryRow>`
      INSERT INTO ticket_categories (name, description, market_center_id, default_assignee_id, created_at, updated_at)
      VALUES (
        ${data.name},
        ${data.description ?? null},
        ${data.marketCenterId},
        ${data.defaultAssigneeId ?? null},
        NOW(),
        NOW()
      )
      RETURNING *
    `;
    return rowToCategory(row!);
  },

  async updateCategory(id: string, data: Partial<{
    name: string;
    description: string | null;
    defaultAssigneeId: string | null;
  }>): Promise<TicketCategory | null> {
    const updates: string[] = ['updated_at = NOW()'];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }
    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(data.description);
    }
    if (data.defaultAssigneeId !== undefined) {
      updates.push(`default_assignee_id = $${paramIndex++}`);
      values.push(data.defaultAssigneeId);
    }

    values.push(id);

    const sql = `
      UPDATE ticket_categories
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const row = await db.rawQueryRow<TicketCategoryRow>(sql, ...values);
    return row ? rowToCategory(row) : null;
  },

  async deleteCategory(id: string): Promise<boolean> {
    await db.exec`DELETE FROM ticket_categories WHERE id = ${id}`;
    return true;
  },

  // Team Invitation operations
  async findInvitationByToken(token: string): Promise<TeamInvitation | null> {
    const row = await db.queryRow<TeamInvitationRow>`
      SELECT * FROM team_invitations WHERE token = ${token}
    `;
    return row ? rowToInvitation(row) : null;
  },

  async findInvitationsByMarketCenterId(marketCenterId: string): Promise<TeamInvitation[]> {
    const rows = await db.queryAll<TeamInvitationRow>`
      SELECT * FROM team_invitations
      WHERE market_center_id = ${marketCenterId}
      ORDER BY created_at DESC
    `;
    return rows.map(rowToInvitation);
  },

  async createInvitation(data: {
    email: string;
    role: UserRole;
    marketCenterId?: string;
    invitedBy?: string;
    token: string;
    expiresAt: Date;
  }): Promise<TeamInvitation> {
    const row = await db.queryRow<TeamInvitationRow>`
      INSERT INTO team_invitations (
        email, role, status, market_center_id, invited_by, token, expires_at, created_at, updated_at
      ) VALUES (
        ${data.email},
        ${data.role},
        'PENDING',
        ${data.marketCenterId ?? null},
        ${data.invitedBy ?? null},
        ${data.token},
        ${data.expiresAt},
        NOW(),
        NOW()
      )
      RETURNING *
    `;
    return rowToInvitation(row!);
  },

  async updateInvitationStatus(id: string, status: InvitationStatus): Promise<TeamInvitation | null> {
    const acceptedAt = status === 'ACCEPTED' ? 'NOW()' : 'null';

    const row = await db.queryRow<TeamInvitationRow>`
      UPDATE team_invitations
      SET status = ${status}, accepted_at = ${status === 'ACCEPTED' ? new Date() : null}, updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;
    return row ? rowToInvitation(row) : null;
  },

  // Market Center History
  async createHistory(data: {
    marketCenterId: string;
    action: string;
    field?: string | null;
    previousValue?: string | null;
    newValue?: string | null;
    snapshot?: any;
    changedById?: string | null;
  }): Promise<void> {
    await db.exec`
      INSERT INTO market_center_history (
        id, market_center_id, action, field, previous_value, new_value, snapshot, changed_by_id, changed_at
      ) VALUES (
        gen_random_uuid()::text,
        ${data.marketCenterId},
        ${data.action},
        ${data.field ?? null},
        ${data.previousValue ?? null},
        ${data.newValue ?? null},
        ${data.snapshot ? toJson(data.snapshot) : null}::jsonb,
        ${data.changedById ?? null},
        NOW()
      )
    `;
  },
};
