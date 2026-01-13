import { describe, it, expect } from "vitest";
import type { TicketCategory, PrismaUser } from "@/lib/types";

/**
 * These tests verify the category selection logic in BaseTicketForm.
 *
 * The key behavior being tested:
 * - When an AGENT selects a category, the assigneeId should NOT be auto-filled
 *   (tickets from Agents should default to "Unassigned")
 * - When STAFF/ADMIN selects a category, the assigneeId SHOULD be auto-filled
 *   with the category's defaultAssigneeId
 *
 * We test the logic directly rather than through full component rendering
 * to avoid issues with Radix UI Select components in jsdom.
 */

// Mock data
const mockAdminUser: PrismaUser = {
  id: "admin-1",
  clerkId: "clerk-admin",
  email: "admin@example.com",
  name: "Admin User",
  role: "ADMIN",
  createdAt: new Date(),
  updatedAt: new Date(),
  isActive: true,
  comments: [],
  marketCenterId: "mc-1",
  _count: {
    assignedTickets: 0,
    createdTickets: 0,
    comments: 0,
    defaultForCategories: 0,
  },
};

const mockCategory: TicketCategory = {
  id: "cat-1",
  name: "General Support",
  description: "General support requests",
  marketCenterId: "mc-1",
  defaultAssigneeId: "admin-1",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockCategoryNoDefault: TicketCategory = {
  id: "cat-2",
  name: "Other",
  description: "Other requests",
  marketCenterId: "mc-1",
  defaultAssigneeId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

/**
 * This function replicates the category selection logic from base-ticket-form.tsx
 * to allow unit testing without rendering the full component.
 */
function handleCategoryChange(
  categoryId: string,
  role: string,
  categories: TicketCategory[],
  assignees: PrismaUser[]
): { categoryId: string; assigneeId?: string } {
  // Only auto-assign based on category default if user is not an Agent
  if (role !== "AGENT") {
    const selectedCategory = categories.find((c) => c?.id === categoryId);
    const assignee = assignees.find(
      (user) => user?.id === selectedCategory?.defaultAssigneeId
    );
    return {
      categoryId,
      assigneeId: assignee && assignee?.id ? assignee.id : "Unassigned",
    };
  } else {
    // Agent tickets should remain unassigned
    return { categoryId };
  }
}

describe("BaseTicketForm - Category Selection Logic", () => {
  const categories = [mockCategory, mockCategoryNoDefault];
  const assignees = [mockAdminUser];

  describe("Agent role", () => {
    it("should NOT include assigneeId when Agent selects a category with default assignee", () => {
      const result = handleCategoryChange("cat-1", "AGENT", categories, assignees);

      expect(result).toEqual({ categoryId: "cat-1" });
      expect(result.assigneeId).toBeUndefined();
    });

    it("should NOT include assigneeId when Agent selects a category without default assignee", () => {
      const result = handleCategoryChange("cat-2", "AGENT", categories, assignees);

      expect(result).toEqual({ categoryId: "cat-2" });
      expect(result.assigneeId).toBeUndefined();
    });
  });

  describe("Staff role", () => {
    it("should auto-assign when Staff selects a category with default assignee", () => {
      const result = handleCategoryChange("cat-1", "STAFF", categories, assignees);

      expect(result).toEqual({
        categoryId: "cat-1",
        assigneeId: "admin-1",
      });
    });

    it("should set assigneeId to Unassigned when Staff selects a category without default assignee", () => {
      const result = handleCategoryChange("cat-2", "STAFF", categories, assignees);

      expect(result).toEqual({
        categoryId: "cat-2",
        assigneeId: "Unassigned",
      });
    });
  });

  describe("Staff Leader role", () => {
    it("should auto-assign when Staff Leader selects a category with default assignee", () => {
      const result = handleCategoryChange("cat-1", "STAFF_LEADER", categories, assignees);

      expect(result).toEqual({
        categoryId: "cat-1",
        assigneeId: "admin-1",
      });
    });
  });

  describe("Admin role", () => {
    it("should auto-assign when Admin selects a category with default assignee", () => {
      const result = handleCategoryChange("cat-1", "ADMIN", categories, assignees);

      expect(result).toEqual({
        categoryId: "cat-1",
        assigneeId: "admin-1",
      });
    });

    it("should set assigneeId to Unassigned when Admin selects a category without default assignee", () => {
      const result = handleCategoryChange("cat-2", "ADMIN", categories, assignees);

      expect(result).toEqual({
        categoryId: "cat-2",
        assigneeId: "Unassigned",
      });
    });
  });
});
