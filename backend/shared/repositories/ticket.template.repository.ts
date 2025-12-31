import {
  db,
  fromTimestamp,
  toJson,
  generateId,
  fromJson,
} from "../../ticket/db";
import { TicketTemplate } from "../../ticket/templates/types";
import { Urgency } from "../../ticket/types";

// =============================================================================
// DATABASE ROW TYPE
// =============================================================================
interface TicketTemplateRow {
  id: string;
  market_center_id: string;
  name: string;
  description: string;
  title: string;
  ticket_description: string;
  categoryId: string | null;
  urgency: Urgency | null;
  tags: any;
  todos: any;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  created_by_id: string | null;
  updated_by_id: string | null;
}

// =============================================================================
// ROW → MODEL
// =============================================================================
function mapTicketTemplateRow(row: TicketTemplateRow): TicketTemplate {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    isActive: row.is_active,
    title: row.title,
    ticketDescription: row.ticket_description,
    categoryId: row.categoryId ?? undefined,
    urgency: row.urgency ?? undefined,
    tags: fromJson(row.tags) ?? [],
    todos: fromJson(row.todos) ?? [],
    marketCenterId: row.market_center_id,
    createdAt:
      fromTimestamp(row.created_at)?.toISOString() ?? new Date().toISOString(),
    updatedAt:
      fromTimestamp(row.updated_at)?.toISOString() ?? new Date().toISOString(),
    createdById: row.created_by_id,
    updatedById: row.updated_by_id,
  };
}

// =============================================================================
// TICKET TEMPLATE REPOSITORY
// =============================================================================
export const ticketTemplateRepository = {
  async findById(id: string): Promise<TicketTemplate | null> {
    const row = await db.queryRow<TicketTemplateRow>`
      SELECT * FROM ticket_templates WHERE id = ${id}
    `;
    return row ? mapTicketTemplateRow(row) : null;
  },

  async findAllByMarketCenter(
    marketCenterId: string
  ): Promise<TicketTemplate[]> {
    const rows = await db.queryAll<TicketTemplateRow>`
      SELECT * FROM ticket_templates
      WHERE market_center_id = ${marketCenterId}
      ORDER BY name ASC
    `;
    return rows.map(mapTicketTemplateRow);
  },

  async create(
    input: Omit<TicketTemplate, "id" | "createdAt" | "updatedAt">,
    userId: string
  ): Promise<TicketTemplate | null> {
    console.log("Creating ticket template with input:", input);

    const id = await generateId();

    const row = await db.queryRow<TicketTemplateRow>`
      INSERT INTO ticket_templates (
        id,
        market_center_id,
        name,
        description,
        title,
        ticket_description,
        categoryId,
        urgency,
        tags,
        todos,
        created_at,
        updated_at,
        created_by_id,
        updated_by_id
      )
      VALUES (
        ${id},
        ${input.marketCenterId},
        ${input.name},
        ${input.description ?? null},
        ${input.title},
        ${input.ticketDescription},
        ${input.categoryId ?? null},
        ${input.urgency ?? null},
        ${toJson(input.tags ?? [])},
        ${toJson(input.todos ?? [])},
        NOW(),
        NOW(),
        ${userId},
        ${userId}
      )
      RETURNING *
    `;

    return row ? mapTicketTemplateRow(row) : null;
  },

  async update(
    id: string,
    input: Partial<TicketTemplate>,
    userId: string
  ): Promise<TicketTemplate | null> {
    const row = await db.queryRow<TicketTemplateRow>`
      UPDATE ticket_templates
      SET
        name = COALESCE(${input.name}, name),
        description = COALESCE(${input.description}, description),
        title = COALESCE(${input.title}, title),
        ticket_description = COALESCE(${input.ticketDescription}, ticket_description),
        categoryId = COALESCE(${input.categoryId}, categoryId),
        urgency = COALESCE(${input.urgency}, urgency),
        tags = COALESCE(${input.tags ? toJson(input.tags) : null}, tags),
        todos = COALESCE(${input.todos ? toJson(input.todos) : null}, todos),
        is_active = COALESCE(${input.isActive}, is_active),
        updated_at = NOW(),
        updated_by_id = ${userId}
      WHERE id = ${id}
      RETURNING *
    `;

    return row ? mapTicketTemplateRow(row) : null;
  },

  async delete(id: string): Promise<boolean> {
    await db.exec`
      DELETE FROM ticket_templates WHERE id = ${id}
    `;
    return true;
  },
};
