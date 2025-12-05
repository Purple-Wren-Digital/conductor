/**
 * Survey Repository - Raw SQL queries for survey/rating operations
 */

import { db, fromTimestamp } from "../../ticket/db";
import type { Survey } from "../../surveys/types";

// Database row types
interface SurveyRow {
  id: string;
  ticket_id: string;
  comment: string | null;
  created_at: Date;
  updated_at: Date | null;
  surveyor_id: string;
  assignee_rating: string | null; // Decimal comes back as string
  market_center_rating: string | null;
  overall_rating: string | null;
  assignee_id: string | null;
  market_center_id: string | null;
  completed: boolean;
}

function rowToSurvey(row: SurveyRow): Survey {
  return {
    id: row.id,
    ticketId: row.ticket_id,
    comment: row.comment,
    createdAt: fromTimestamp(row.created_at)!,
    updatedAt: row.updated_at ? fromTimestamp(row.updated_at) : undefined,
    surveyorId: row.surveyor_id,
    assigneeRating: row.assignee_rating ? parseFloat(row.assignee_rating) : null,
    marketCenterRating: row.market_center_rating ? parseFloat(row.market_center_rating) : null,
    overallRating: row.overall_rating ? parseFloat(row.overall_rating) : null,
    assigneeId: row.assignee_id,
    marketCenterId: row.market_center_id,
    completed: row.completed,
  };
}

export const surveyRepository = {
  // Find survey by ID
  async findById(id: string): Promise<Survey | null> {
    const row = await db.queryRow<SurveyRow>`
      SELECT * FROM ticket_ratings WHERE id = ${id}
    `;
    return row ? rowToSurvey(row) : null;
  },

  // Find survey by ticket ID
  async findByTicketId(ticketId: string): Promise<Survey | null> {
    const row = await db.queryRow<SurveyRow>`
      SELECT * FROM ticket_ratings WHERE ticket_id = ${ticketId}
    `;
    return row ? rowToSurvey(row) : null;
  },

  // Create survey
  async create(data: {
    ticketId: string;
    surveyorId: string;
    assigneeId?: string | null;
    marketCenterId?: string | null;
  }): Promise<Survey> {
    const row = await db.queryRow<SurveyRow>`
      INSERT INTO ticket_ratings (
        ticket_id, surveyor_id, assignee_id, market_center_id, completed, created_at
      ) VALUES (
        ${data.ticketId},
        ${data.surveyorId},
        ${data.assigneeId ?? null},
        ${data.marketCenterId ?? null},
        false,
        NOW()
      )
      RETURNING *
    `;
    return rowToSurvey(row!);
  },

  // Update survey (submit ratings)
  async update(id: string, data: Partial<{
    assigneeRating: number | null;
    marketCenterRating: number | null;
    overallRating: number | null;
    comment: string | null;
    completed: boolean;
  }>): Promise<Survey | null> {
    const updates: string[] = ['updated_at = NOW()'];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.assigneeRating !== undefined) {
      updates.push(`assignee_rating = $${paramIndex++}`);
      values.push(data.assigneeRating);
    }
    if (data.marketCenterRating !== undefined) {
      updates.push(`market_center_rating = $${paramIndex++}`);
      values.push(data.marketCenterRating);
    }
    if (data.overallRating !== undefined) {
      updates.push(`overall_rating = $${paramIndex++}`);
      values.push(data.overallRating);
    }
    if (data.comment !== undefined) {
      updates.push(`comment = $${paramIndex++}`);
      values.push(data.comment);
    }
    if (data.completed !== undefined) {
      updates.push(`completed = $${paramIndex++}`);
      values.push(data.completed);
    }

    values.push(id);

    const sql = `
      UPDATE ticket_ratings
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const row = await db.rawQueryRow<SurveyRow>(sql, ...values);
    return row ? rowToSurvey(row) : null;
  },

  // Get average ratings for assignee
  async getAssigneeAverages(assigneeId: string): Promise<{
    totalSurveys: number;
    assigneeAverageRating: number | null;
    overallAverageRating: number | null;
    marketCenterAverageRating: number | null;
  }> {
    const result = await db.queryRow<{
      total: number;
      assignee_avg: string | null;
      overall_avg: string | null;
      mc_avg: string | null;
    }>`
      SELECT
        COUNT(*)::int as total,
        AVG(assignee_rating)::decimal(3,2) as assignee_avg,
        AVG(overall_rating)::decimal(3,2) as overall_avg,
        AVG(market_center_rating)::decimal(3,2) as mc_avg
      FROM ticket_ratings
      WHERE assignee_id = ${assigneeId} AND completed = true
    `;

    return {
      totalSurveys: result?.total ?? 0,
      assigneeAverageRating: result?.assignee_avg ? parseFloat(result.assignee_avg) : null,
      overallAverageRating: result?.overall_avg ? parseFloat(result.overall_avg) : null,
      marketCenterAverageRating: result?.mc_avg ? parseFloat(result.mc_avg) : null,
    };
  },

  // Get all average ratings (for admin)
  async getAllAverages(): Promise<{
    totalSurveys: number;
    assigneeAverageRating: number | null;
    overallAverageRating: number | null;
    marketCenterAverageRating: number | null;
  }> {
    const result = await db.queryRow<{
      total: number;
      assignee_avg: string | null;
      overall_avg: string | null;
      mc_avg: string | null;
    }>`
      SELECT
        COUNT(*)::int as total,
        AVG(assignee_rating)::decimal(3,2) as assignee_avg,
        AVG(overall_rating)::decimal(3,2) as overall_avg,
        AVG(market_center_rating)::decimal(3,2) as mc_avg
      FROM ticket_ratings
      WHERE completed = true
    `;

    return {
      totalSurveys: result?.total ?? 0,
      assigneeAverageRating: result?.assignee_avg ? parseFloat(result.assignee_avg) : null,
      overallAverageRating: result?.overall_avg ? parseFloat(result.overall_avg) : null,
      marketCenterAverageRating: result?.mc_avg ? parseFloat(result.mc_avg) : null,
    };
  },

  // Check if surveys exist for assignee
  async hasCompletedSurveysForAssignee(assigneeId: string): Promise<boolean> {
    const result = await db.queryRow<{ exists: boolean }>`
      SELECT EXISTS(SELECT 1 FROM ticket_ratings WHERE assignee_id = ${assigneeId} AND completed = true) as exists
    `;
    return result?.exists ?? false;
  },

  // Check if surveys exist for market center
  async hasCompletedSurveysForMarketCenter(marketCenterId: string): Promise<boolean> {
    const result = await db.queryRow<{ exists: boolean }>`
      SELECT EXISTS(SELECT 1 FROM ticket_ratings WHERE market_center_id = ${marketCenterId} AND completed = true) as exists
    `;
    return result?.exists ?? false;
  },

  // Get average ratings for market center
  async getMarketCenterAverages(marketCenterId: string): Promise<{
    totalSurveys: number;
    marketCenterAverageRating: number | null;
    overallAverageRating: number | null;
    assigneeAverageRating: number | null;
  }> {
    const result = await db.queryRow<{
      total: number;
      mc_avg: string | null;
      overall_avg: string | null;
      assignee_avg: string | null;
    }>`
      SELECT
        COUNT(*)::int as total,
        AVG(market_center_rating)::decimal(3,2) as mc_avg,
        AVG(overall_rating)::decimal(3,2) as overall_avg,
        AVG(assignee_rating)::decimal(3,2) as assignee_avg
      FROM ticket_ratings
      WHERE market_center_id = ${marketCenterId} AND completed = true
    `;

    return {
      totalSurveys: result?.total ?? 0,
      marketCenterAverageRating: result?.mc_avg ? parseFloat(result.mc_avg) : null,
      overallAverageRating: result?.overall_avg ? parseFloat(result.overall_avg) : null,
      assigneeAverageRating: result?.assignee_avg ? parseFloat(result.assignee_avg) : null,
    };
  },

  // Find surveys by surveyor
  async findBySurveyorId(surveyorId: string): Promise<Survey[]> {
    const rows = await db.queryAll<SurveyRow>`
      SELECT * FROM ticket_ratings
      WHERE surveyor_id = ${surveyorId}
      ORDER BY created_at DESC
    `;
    return rows.map(rowToSurvey);
  },

  // Find pending (incomplete) surveys for user
  async findPendingBySurveyorId(surveyorId: string): Promise<Survey[]> {
    const rows = await db.queryAll<SurveyRow>`
      SELECT * FROM ticket_ratings
      WHERE surveyor_id = ${surveyorId} AND completed = false
      ORDER BY created_at DESC
    `;
    return rows.map(rowToSurvey);
  },

  // Find survey by ID with relations (ticket, assignee, surveyor, marketCenter)
  async findByIdWithRelations(id: string): Promise<Survey | null> {
    const row = await db.queryRow<SurveyRow>`
      SELECT * FROM ticket_ratings WHERE id = ${id}
    `;
    if (!row) return null;

    const survey = rowToSurvey(row);

    // Fetch related ticket
    if (row.ticket_id) {
      const ticket = await db.queryRow<{
        id: string;
        title: string;
        description: string;
        status: string;
        urgency: string;
        due_date: Date | null;
        created_at: Date;
        updated_at: Date;
        resolved_at: Date | null;
        assignee_id: string | null;
      }>`SELECT id, title, description, status, urgency, due_date, created_at, updated_at, resolved_at, assignee_id FROM tickets WHERE id = ${row.ticket_id}`;
      if (ticket) {
        survey.ticket = {
          id: ticket.id,
          title: ticket.title,
          description: ticket.description,
          status: ticket.status as any,
          urgency: ticket.urgency as any,
          dueDate: ticket.due_date,
          createdAt: fromTimestamp(ticket.created_at)!,
          updatedAt: fromTimestamp(ticket.updated_at)!,
          resolvedAt: ticket.resolved_at,
        };
      }
    }

    // Fetch surveyor
    if (row.surveyor_id) {
      const surveyor = await db.queryRow<{ id: string; name: string | null; email: string }>`
        SELECT id, name, email FROM users WHERE id = ${row.surveyor_id}
      `;
      if (surveyor) {
        survey.surveyor = {
          id: surveyor.id,
          name: surveyor.name ?? "",
          email: surveyor.email,
        };
      }
    }

    // Fetch assignee
    if (row.assignee_id) {
      const assignee = await db.queryRow<{ id: string; name: string | null; email: string }>`
        SELECT id, name, email FROM users WHERE id = ${row.assignee_id}
      `;
      if (assignee) {
        survey.assignee = {
          id: assignee.id,
          name: assignee.name ?? "",
          email: assignee.email,
        };
      }
    }

    // Fetch market center
    if (row.market_center_id) {
      const mc = await db.queryRow<{ id: string; name: string }>`
        SELECT id, name FROM market_centers WHERE id = ${row.market_center_id}
      `;
      if (mc) {
        survey.marketCenter = {
          id: mc.id,
          name: mc.name,
        };
      }
    }

    return survey;
  },

  // Delete survey
  async delete(id: string): Promise<boolean> {
    await db.exec`DELETE FROM ticket_ratings WHERE id = ${id}`;
    return true;
  },

  // Delete survey by ticket ID
  async deleteByTicketId(ticketId: string): Promise<boolean> {
    await db.exec`DELETE FROM ticket_ratings WHERE ticket_id = ${ticketId}`;
    return true;
  },
};
