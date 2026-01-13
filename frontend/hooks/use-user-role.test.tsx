import { describe, it, expect } from "vitest";
import { getUserPermissions, type UserPermissions } from "./use-user-role";
import type { UserRole } from "@/lib/types";

// =============================================================================
// getUserPermissions TESTS
// =============================================================================

describe("getUserPermissions", () => {
  describe("ADMIN role", () => {
    it("should return correct permissions for ADMIN", () => {
      const permissions = getUserPermissions("ADMIN");

      expect(permissions.canCreateTicket).toBe(true);
      expect(permissions.canEditAnyTicket).toBe(true);
      expect(permissions.canDeleteTicket).toBe(true);
      expect(permissions.canReassignTicket).toBe(true);
      expect(permissions.canUnassignTicket).toBe(true);
      expect(permissions.canChangeTicketCreator).toBe(true);
      expect(permissions.canBulkUpdate).toBe(true);
      expect(permissions.canViewAllTickets).toBe(true);
      expect(permissions.canViewInternalComments).toBe(true);
      expect(permissions.canCreateInternalComments).toBe(true);
      expect(permissions.canManageAllUsers).toBe(true);
      expect(permissions.canChangeUserRoles).toBe(true);
      expect(permissions.canManageAllMarketCenters).toBe(true);
      expect(permissions.canAccessSettings).toBe(true);
      expect(permissions.canAccessReports).toBe(true);
    });
  });

  describe("STAFF_LEADER role", () => {
    it("should return correct permissions for STAFF_LEADER", () => {
      const permissions = getUserPermissions("STAFF_LEADER");

      expect(permissions.canCreateTicket).toBe(true);
      expect(permissions.canEditAnyTicket).toBe(false);
      expect(permissions.canDeleteTicket).toBe(true);
      expect(permissions.canReassignTicket).toBe(true);
      expect(permissions.canUnassignTicket).toBe(true);
      expect(permissions.canChangeTicketCreator).toBe(true);
      expect(permissions.canBulkUpdate).toBe(true);
      expect(permissions.canViewAllTickets).toBe(false);
      expect(permissions.canViewInternalComments).toBe(true);
      expect(permissions.canCreateInternalComments).toBe(true);
      expect(permissions.canManageTeam).toBe(true);
      expect(permissions.canAccessSettings).toBe(true);
      expect(permissions.canAccessReports).toBe(true);
    });
  });

  describe("STAFF role", () => {
    it("should return correct permissions for STAFF", () => {
      const permissions = getUserPermissions("STAFF");

      expect(permissions.canCreateTicket).toBe(true);
      expect(permissions.canEditAnyTicket).toBe(false);
      expect(permissions.canDeleteTicket).toBe(true);
      expect(permissions.canReassignTicket).toBe(true);
      expect(permissions.canUnassignTicket).toBe(false);
      expect(permissions.canChangeTicketCreator).toBe(false);
      expect(permissions.canBulkUpdate).toBe(true);
      expect(permissions.canViewAllTickets).toBe(false);
      expect(permissions.canViewInternalComments).toBe(true);
      expect(permissions.canCreateInternalComments).toBe(true);
      expect(permissions.canManageTeam).toBe(true);
      expect(permissions.canAccessSettings).toBe(false);
      expect(permissions.canAccessReports).toBe(false);
    });
  });

  describe("AGENT role", () => {
    it("should return correct permissions for AGENT", () => {
      const permissions = getUserPermissions("AGENT");

      expect(permissions.canCreateTicket).toBe(true);
      expect(permissions.canEditAnyTicket).toBe(false);
      expect(permissions.canDeleteTicket).toBe(false);
      expect(permissions.canReassignTicket).toBe(false);
      expect(permissions.canUnassignTicket).toBe(false);
      expect(permissions.canChangeTicketCreator).toBe(false);
      expect(permissions.canBulkUpdate).toBe(false);
      expect(permissions.canViewAllTickets).toBe(false);
      expect(permissions.canViewInternalComments).toBe(false);
      expect(permissions.canCreateInternalComments).toBe(false);
      expect(permissions.canManageTeam).toBe(false);
      expect(permissions.canAccessSettings).toBe(false);
      expect(permissions.canAccessReports).toBe(false);
      expect(permissions.canTakeTicketSurvey).toBe(true);
    });
  });

  describe("unknown/default role", () => {
    it("should return restrictive permissions for unknown role", () => {
      const permissions = getUserPermissions("UNKNOWN" as UserRole);

      expect(permissions.canCreateTicket).toBe(false);
      expect(permissions.canEditAnyTicket).toBe(false);
      expect(permissions.canDeleteTicket).toBe(false);
      expect(permissions.canReassignTicket).toBe(false);
      expect(permissions.canUnassignTicket).toBe(false);
      expect(permissions.canChangeTicketCreator).toBe(false);
      expect(permissions.canBulkUpdate).toBe(false);
      expect(permissions.canViewAllTickets).toBe(false);
      expect(permissions.canViewInternalComments).toBe(false);
      expect(permissions.canCreateInternalComments).toBe(false);
      expect(permissions.canManageTeam).toBe(false);
      expect(permissions.canAccessSettings).toBe(false);
      expect(permissions.canAccessReports).toBe(false);
    });
  });

  describe("canChangeTicketCreator permission", () => {
    it("should allow ADMIN to change ticket creator", () => {
      const permissions = getUserPermissions("ADMIN");
      expect(permissions.canChangeTicketCreator).toBe(true);
    });

    it("should allow STAFF_LEADER to change ticket creator", () => {
      const permissions = getUserPermissions("STAFF_LEADER");
      expect(permissions.canChangeTicketCreator).toBe(true);
    });

    it("should NOT allow STAFF to change ticket creator", () => {
      const permissions = getUserPermissions("STAFF");
      expect(permissions.canChangeTicketCreator).toBe(false);
    });

    it("should NOT allow AGENT to change ticket creator", () => {
      const permissions = getUserPermissions("AGENT");
      expect(permissions.canChangeTicketCreator).toBe(false);
    });
  });
});
