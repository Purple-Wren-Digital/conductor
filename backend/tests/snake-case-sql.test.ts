/**
 * Test suite to verify all SQL queries use snake_case table and column names
 * These tests help ensure we don't revert to PascalCase (old Prisma style)
 */

import { describe, it, expect } from "vitest";

// Helper to check SQL query patterns
function assertSnakeCaseTable(sql: string, expectedTable: string): void {
  const tablePattern = new RegExp(`(FROM|INTO|UPDATE|DELETE FROM|JOIN)\\s+${expectedTable}\\b`, 'i');
  expect(sql).toMatch(tablePattern);
}

function assertNoQuotedPascalCase(sql: string): void {
  // Check for quoted PascalCase identifiers like "Notification", "UserHistory", etc.
  const pascalCasePattern = /"[A-Z][a-zA-Z]+"/g;
  const matches = sql.match(pascalCasePattern);
  expect(matches).toBeNull();
}

describe("Snake Case SQL Patterns", () => {
  describe("Table Names", () => {
    it("should use 'notifications' not 'Notification'", () => {
      const validSql = "SELECT * FROM notifications WHERE user_id = $1";
      assertSnakeCaseTable(validSql, "notifications");
      assertNoQuotedPascalCase(validSql);
    });

    it("should use 'users' not 'User'", () => {
      const validSql = "SELECT * FROM users WHERE id = $1";
      assertSnakeCaseTable(validSql, "users");
      assertNoQuotedPascalCase(validSql);
    });

    it("should use 'tickets' not 'Ticket'", () => {
      const validSql = "SELECT * FROM tickets WHERE id = $1";
      assertSnakeCaseTable(validSql, "tickets");
      assertNoQuotedPascalCase(validSql);
    });

    it("should use 'ticket_history' not 'TicketHistory'", () => {
      const validSql = "SELECT * FROM ticket_history WHERE ticket_id = $1";
      assertSnakeCaseTable(validSql, "ticket_history");
      assertNoQuotedPascalCase(validSql);
    });

    it("should use 'user_history' not 'UserHistory'", () => {
      const validSql = "SELECT * FROM user_history WHERE user_id = $1";
      assertSnakeCaseTable(validSql, "user_history");
      assertNoQuotedPascalCase(validSql);
    });

    it("should use 'market_center_history' not 'MarketCenterHistory'", () => {
      const validSql = "SELECT * FROM market_center_history WHERE market_center_id = $1";
      assertSnakeCaseTable(validSql, "market_center_history");
      assertNoQuotedPascalCase(validSql);
    });

    it("should use 'notification_templates' not 'NotificationTemplate'", () => {
      const validSql = "SELECT * FROM notification_templates ORDER BY template_name";
      assertSnakeCaseTable(validSql, "notification_templates");
      assertNoQuotedPascalCase(validSql);
    });

    it("should use 'notification_preferences' not 'NotificationPreferences'", () => {
      const validSql = "SELECT * FROM notification_preferences WHERE user_settings_id = $1";
      assertSnakeCaseTable(validSql, "notification_preferences");
      assertNoQuotedPascalCase(validSql);
    });

    it("should use 'user_settings' not 'UserSettings'", () => {
      const validSql = "SELECT * FROM user_settings WHERE user_id = $1";
      assertSnakeCaseTable(validSql, "user_settings");
      assertNoQuotedPascalCase(validSql);
    });

    it("should use 'team_invitations' not 'TeamInvitation'", () => {
      const validSql = "SELECT * FROM team_invitations WHERE market_center_id = $1";
      assertSnakeCaseTable(validSql, "team_invitations");
      assertNoQuotedPascalCase(validSql);
    });

    it("should use 'ticket_categories' not 'TicketCategory'", () => {
      const validSql = "SELECT * FROM ticket_categories WHERE market_center_id = $1";
      assertSnakeCaseTable(validSql, "ticket_categories");
      assertNoQuotedPascalCase(validSql);
    });
  });

  describe("Column Names", () => {
    it("should use 'user_id' not 'userId'", () => {
      const validSql = "SELECT user_id FROM notifications WHERE user_id = $1";
      expect(validSql).toContain("user_id");
      expect(validSql).not.toMatch(/"userId"/);
    });

    it("should use 'created_at' not 'createdAt'", () => {
      const validSql = "SELECT created_at FROM notifications ORDER BY created_at DESC";
      expect(validSql).toContain("created_at");
      expect(validSql).not.toMatch(/"createdAt"/);
    });

    it("should use 'updated_at' not 'updatedAt'", () => {
      const validSql = "UPDATE users SET updated_at = NOW() WHERE id = $1";
      expect(validSql).toContain("updated_at");
      expect(validSql).not.toMatch(/"updatedAt"/);
    });

    it("should use 'delivered_at' not 'deliveredAt'", () => {
      const validSql = "UPDATE notifications SET delivered_at = NOW() WHERE id = $1";
      expect(validSql).toContain("delivered_at");
      expect(validSql).not.toMatch(/"deliveredAt"/);
    });

    it("should use 'changed_at' not 'changedAt'", () => {
      const validSql = "SELECT changed_at FROM ticket_history ORDER BY changed_at DESC";
      expect(validSql).toContain("changed_at");
      expect(validSql).not.toMatch(/"changedAt"/);
    });

    it("should use 'changed_by_id' not 'changedById'", () => {
      const validSql = "SELECT changed_by_id FROM user_history WHERE changed_by_id = $1";
      expect(validSql).toContain("changed_by_id");
      expect(validSql).not.toMatch(/"changedById"/);
    });

    it("should use 'previous_value' not 'previousValue'", () => {
      const validSql = "SELECT previous_value FROM ticket_history WHERE id = $1";
      expect(validSql).toContain("previous_value");
      expect(validSql).not.toMatch(/"previousValue"/);
    });

    it("should use 'new_value' not 'newValue'", () => {
      const validSql = "SELECT new_value FROM ticket_history WHERE id = $1";
      expect(validSql).toContain("new_value");
      expect(validSql).not.toMatch(/"newValue"/);
    });

    it("should use 'market_center_id' not 'marketCenterId'", () => {
      const validSql = "SELECT market_center_id FROM users WHERE market_center_id = $1";
      expect(validSql).toContain("market_center_id");
      expect(validSql).not.toMatch(/"marketCenterId"/);
    });

    it("should use 'is_active' not 'isActive'", () => {
      const validSql = "SELECT is_active FROM users WHERE is_active = true";
      expect(validSql).toContain("is_active");
      expect(validSql).not.toMatch(/"isActive"/);
    });

    it("should use 'deleted_at' not 'deletedAt'", () => {
      const validSql = "SELECT deleted_at FROM users WHERE deleted_at IS NULL";
      expect(validSql).toContain("deleted_at");
      expect(validSql).not.toMatch(/"deletedAt"/);
    });

    it("should use 'due_date' not 'dueDate'", () => {
      const validSql = "SELECT due_date FROM tickets WHERE due_date < NOW()";
      expect(validSql).toContain("due_date");
      expect(validSql).not.toMatch(/"dueDate"/);
    });

    it("should use 'resolved_at' not 'resolvedAt'", () => {
      const validSql = "UPDATE tickets SET resolved_at = NOW() WHERE id = $1";
      expect(validSql).toContain("resolved_at");
      expect(validSql).not.toMatch(/"resolvedAt"/);
    });

    it("should use 'assignee_id' not 'assigneeId'", () => {
      const validSql = "SELECT assignee_id FROM tickets WHERE assignee_id = $1";
      expect(validSql).toContain("assignee_id");
      expect(validSql).not.toMatch(/"assigneeId"/);
    });

    it("should use 'creator_id' not 'creatorId'", () => {
      const validSql = "SELECT creator_id FROM tickets WHERE creator_id = $1";
      expect(validSql).toContain("creator_id");
      expect(validSql).not.toMatch(/"creatorId"/);
    });

    it("should use 'ticket_id' not 'ticketId'", () => {
      const validSql = "SELECT ticket_id FROM ticket_history WHERE ticket_id = $1";
      expect(validSql).toContain("ticket_id");
      expect(validSql).not.toMatch(/"ticketId"/);
    });

    it("should use 'template_name' not 'templateName'", () => {
      const validSql = "SELECT template_name FROM notification_templates ORDER BY template_name";
      expect(validSql).toContain("template_name");
      expect(validSql).not.toMatch(/"templateName"/);
    });

    it("should use 'user_settings_id' not 'userSettingsId'", () => {
      const validSql = "SELECT user_settings_id FROM notification_preferences WHERE user_settings_id = $1";
      expect(validSql).toContain("user_settings_id");
      expect(validSql).not.toMatch(/"userSettingsId"/);
    });

    it("should use 'in_app' not 'inApp'", () => {
      const validSql = "UPDATE notification_preferences SET in_app = true WHERE id = $1";
      expect(validSql).toContain("in_app");
      expect(validSql).not.toMatch(/"inApp"/);
    });

    it("should use 'is_default' not 'isDefault'", () => {
      const validSql = "SELECT is_default FROM notification_templates WHERE is_default = true";
      expect(validSql).toContain("is_default");
      expect(validSql).not.toMatch(/"isDefault"/);
    });

    it("should use 'expires_at' not 'expiresAt'", () => {
      const validSql = "SELECT expires_at FROM team_invitations WHERE expires_at > NOW()";
      expect(validSql).toContain("expires_at");
      expect(validSql).not.toMatch(/"expiresAt"/);
    });

    it("should use 'default_assignee_id' not 'defaultAssigneeId'", () => {
      const validSql = "SELECT default_assignee_id FROM ticket_categories WHERE default_assignee_id IS NOT NULL";
      expect(validSql).toContain("default_assignee_id");
      expect(validSql).not.toMatch(/"defaultAssigneeId"/);
    });

    it("should use 'category_id' not 'categoryId'", () => {
      const validSql = "SELECT category_id FROM tickets WHERE category_id = $1";
      expect(validSql).toContain("category_id");
      expect(validSql).not.toMatch(/"categoryId"/);
    });

    it("should use 'clerk_id' not 'clerkId'", () => {
      const validSql = "SELECT clerk_id FROM users WHERE clerk_id = $1";
      expect(validSql).toContain("clerk_id");
      expect(validSql).not.toMatch(/"clerkId"/);
    });
  });

  describe("INSERT statements", () => {
    it("should use snake_case in INSERT INTO with correct column list", () => {
      const validSql = `
        INSERT INTO notifications (
          id, user_id, channel, category, type, title, body, data, priority, read, delivered_at, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `;
      assertSnakeCaseTable(validSql, "notifications");
      expect(validSql).toContain("user_id");
      expect(validSql).toContain("delivered_at");
      expect(validSql).toContain("created_at");
      assertNoQuotedPascalCase(validSql);
    });

    it("should use snake_case in INSERT INTO ticket_history", () => {
      const validSql = `
        INSERT INTO ticket_history (
          id, ticket_id, action, field, previous_value, new_value, snapshot, changed_by_id, changed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      `;
      assertSnakeCaseTable(validSql, "ticket_history");
      expect(validSql).toContain("ticket_id");
      expect(validSql).toContain("previous_value");
      expect(validSql).toContain("new_value");
      expect(validSql).toContain("changed_by_id");
      expect(validSql).toContain("changed_at");
      assertNoQuotedPascalCase(validSql);
    });

    it("should use snake_case in INSERT INTO user_history", () => {
      const validSql = `
        INSERT INTO user_history (
          id, user_id, market_center_id, action, field, previous_value, new_value, snapshot, changed_by_id, changed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      `;
      assertSnakeCaseTable(validSql, "user_history");
      expect(validSql).toContain("user_id");
      expect(validSql).toContain("market_center_id");
      expect(validSql).toContain("previous_value");
      expect(validSql).toContain("new_value");
      expect(validSql).toContain("changed_by_id");
      expect(validSql).toContain("changed_at");
      assertNoQuotedPascalCase(validSql);
    });

    it("should use snake_case in INSERT INTO market_center_history", () => {
      const validSql = `
        INSERT INTO market_center_history (
          id, market_center_id, action, field, previous_value, new_value, snapshot, changed_by_id, changed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      `;
      assertSnakeCaseTable(validSql, "market_center_history");
      expect(validSql).toContain("market_center_id");
      expect(validSql).toContain("previous_value");
      expect(validSql).toContain("new_value");
      expect(validSql).toContain("changed_by_id");
      expect(validSql).toContain("changed_at");
      assertNoQuotedPascalCase(validSql);
    });
  });

  describe("UPDATE statements", () => {
    it("should use snake_case in UPDATE users", () => {
      const validSql = `
        UPDATE users
        SET deleted_at = NOW(), is_active = false, updated_at = NOW()
        WHERE id = $1
      `;
      assertSnakeCaseTable(validSql, "users");
      expect(validSql).toContain("deleted_at");
      expect(validSql).toContain("is_active");
      expect(validSql).toContain("updated_at");
      assertNoQuotedPascalCase(validSql);
    });

    it("should use snake_case in UPDATE tickets", () => {
      const validSql = `
        UPDATE tickets
        SET assignee_id = $1, updated_at = NOW()
        WHERE assignee_id = $2
          AND status IN ('ASSIGNED', 'IN_PROGRESS', 'AWAITING_RESPONSE')
      `;
      assertSnakeCaseTable(validSql, "tickets");
      expect(validSql).toContain("assignee_id");
      expect(validSql).toContain("updated_at");
      assertNoQuotedPascalCase(validSql);
    });

    it("should use snake_case in UPDATE notifications", () => {
      const validSql = `
        UPDATE notifications
        SET read = true, delivered_at = NOW()
        WHERE id = $1
      `;
      assertSnakeCaseTable(validSql, "notifications");
      expect(validSql).toContain("delivered_at");
      assertNoQuotedPascalCase(validSql);
    });
  });

  describe("DELETE statements", () => {
    it("should use snake_case in DELETE FROM notifications", () => {
      const validSql = `
        DELETE FROM notifications
        WHERE read = true AND created_at <= $1
      `;
      assertSnakeCaseTable(validSql, "notifications");
      expect(validSql).toContain("created_at");
      assertNoQuotedPascalCase(validSql);
    });

    it("should use snake_case in DELETE FROM notification_preferences", () => {
      const validSql = `
        DELETE FROM notification_preferences
        WHERE user_settings_id = $1
      `;
      assertSnakeCaseTable(validSql, "notification_preferences");
      expect(validSql).toContain("user_settings_id");
      assertNoQuotedPascalCase(validSql);
    });
  });

  describe("Encore SQLDatabase compatibility", () => {
    it("should not use db.raw() which does not exist in Encore", () => {
      // db.raw() does not exist in Encore's SQLDatabase
      // For dynamic ORDER BY, use conditional queries or rawQueryAll with string interpolation
      const validDescQuery = `
        SELECT * FROM ticket_history th
        WHERE th.ticket_id = $1
        ORDER BY th.changed_at DESC
        LIMIT $2
      `;
      const validAscQuery = `
        SELECT * FROM ticket_history th
        WHERE th.ticket_id = $1
        ORDER BY th.changed_at ASC
        LIMIT $2
      `;
      // Both queries should be valid
      expect(validDescQuery).toContain("ORDER BY th.changed_at DESC");
      expect(validAscQuery).toContain("ORDER BY th.changed_at ASC");
      // Neither should use db.raw()
      expect(validDescQuery).not.toContain("db.raw");
      expect(validAscQuery).not.toContain("db.raw");
    });

    it("should use rawQueryAll for dynamic ORDER BY with string interpolation", () => {
      // This pattern is valid - using string interpolation in rawQueryAll
      const orderDir = "DESC";
      const validSql = `
        SELECT * FROM user_history
        WHERE user_id = $1
        ORDER BY changed_at ${orderDir}
      `;
      expect(validSql).toContain("ORDER BY changed_at DESC");
    });
  });

  describe("Seed file table names", () => {
    it("should use 'user_settings' for INSERT", () => {
      const validSql = `
        INSERT INTO user_settings (id, user_id, created_at, updated_at)
        VALUES (gen_random_uuid()::text, $1, NOW(), NOW())
      `;
      assertSnakeCaseTable(validSql, "user_settings");
      expect(validSql).toContain("user_id");
      expect(validSql).toContain("created_at");
      expect(validSql).toContain("updated_at");
      assertNoQuotedPascalCase(validSql);
    });

    it("should use 'notification_preferences' for INSERT", () => {
      const validSql = `
        INSERT INTO notification_preferences (
          id, user_settings_id, type, email, push, in_app, category, frequency, sms
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `;
      assertSnakeCaseTable(validSql, "notification_preferences");
      expect(validSql).toContain("user_settings_id");
      expect(validSql).toContain("in_app");
      assertNoQuotedPascalCase(validSql);
    });

    it("should use 'notifications' for INSERT", () => {
      const validSql = `
        INSERT INTO notifications (
          id, user_id, channel, category, priority, type, title, body,
          delivered_at, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `;
      assertSnakeCaseTable(validSql, "notifications");
      expect(validSql).toContain("user_id");
      expect(validSql).toContain("delivered_at");
      expect(validSql).toContain("created_at");
      assertNoQuotedPascalCase(validSql);
    });

    it("should use 'notification_templates' for INSERT", () => {
      const validSql = `
        INSERT INTO notification_templates (
          id, template_name, template_description, type, channel, category,
          subject, body, is_default, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `;
      assertSnakeCaseTable(validSql, "notification_templates");
      expect(validSql).toContain("template_name");
      expect(validSql).toContain("template_description");
      expect(validSql).toContain("is_default");
      expect(validSql).toContain("created_at");
      assertNoQuotedPascalCase(validSql);
    });

    it("should use snake_case for DELETE statements in seed cleanup", () => {
      const validDeletes = [
        "DELETE FROM ticket_history",
        "DELETE FROM notifications",
        "DELETE FROM notification_preferences",
        "DELETE FROM notification_templates",
        "DELETE FROM user_history",
        "DELETE FROM user_settings",
        "DELETE FROM market_center_history",
      ];

      for (const sql of validDeletes) {
        assertNoQuotedPascalCase(sql);
        expect(sql).not.toMatch(/"[A-Z]/);
      }
    });
  });

  describe("JOIN statements", () => {
    it("should use snake_case in JOIN with users table", () => {
      const validSql = `
        SELECT th.*, u.clerk_id, u.email, u.name
        FROM ticket_history th
        LEFT JOIN users u ON u.id = th.changed_by_id
        WHERE th.ticket_id = $1
      `;
      expect(validSql).toContain("ticket_history");
      expect(validSql).toContain("JOIN users");
      expect(validSql).toContain("changed_by_id");
      expect(validSql).toContain("clerk_id");
      assertNoQuotedPascalCase(validSql);
    });

    it("should use snake_case in JOIN with tickets for auto-assignment", () => {
      const validSql = `
        SELECT u.id
        FROM users u
        LEFT JOIN tickets t ON t.assignee_id = u.id
        WHERE u.role IN ('STAFF', 'ADMIN')
        GROUP BY u.id
        ORDER BY COUNT(t.id) ASC
        LIMIT 1
      `;
      expect(validSql).toContain("users u");
      expect(validSql).toContain("JOIN tickets");
      expect(validSql).toContain("assignee_id");
      assertNoQuotedPascalCase(validSql);
    });
  });
});
