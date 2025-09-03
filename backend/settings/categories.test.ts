import { describe, it, expect, beforeEach, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  mockPrisma: {
    ticketCategory: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("./db", () => ({
  getPrisma: () => hoisted.mockPrisma,
}));

vi.mock("encore.dev/api", () => ({
  api: vi.fn((config, handler) => handler),
  APIError: {
    notFound: vi.fn((msg) => new Error(msg)),
    invalidArgument: vi.fn((msg) => new Error(msg)),
  },
}));

import {
  createCategory,
  updateCategory,
  deleteCategory,
  listCategories,
} from "./categories";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Category Management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createCategory", () => {
    it("should create a category with default assignee", async () => {
      const mockUser = {
        id: "user_1",
        name: "Test User",
        email: "test@example.com",
      };
      const mockCategory = {
        id: "cat_1",
        name: "Technical Support",
        description: "Technical issues",
        marketCenterId: "market_center_1",
        defaultAssigneeId: "user_1",
        createdAt: new Date(),
        updatedAt: new Date(),
        defaultAssignee: mockUser,
      };

      hoisted.mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      hoisted.mockPrisma.ticketCategory.findUnique.mockResolvedValue(null);
      hoisted.mockPrisma.ticketCategory.create.mockResolvedValue(mockCategory);

      const result = await createCategory({
        name: "Technical Support",
        description: "Technical issues",
        defaultAssigneeId: "user_1",
      });

      expect(result.category).toEqual(mockCategory);
      expect(hoisted.mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: "user_1" },
      });
      expect(hoisted.mockPrisma.ticketCategory.create).toHaveBeenCalledWith({
        data: {
          name: "Technical Support",
          description: "Technical issues",
          marketCenterId: "market_center_1",
          defaultAssigneeId: "user_1",
        },
        include: {
          defaultAssignee: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
    });

    it("should create a category without default assignee", async () => {
      const mockCategory = {
        id: "cat_1",
        name: "General",
        description: "General inquiries",
        marketCenterId: "market_center_1",
        defaultAssigneeId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        defaultAssignee: null,
      };

      hoisted.mockPrisma.ticketCategory.findUnique.mockResolvedValue(null);
      hoisted.mockPrisma.ticketCategory.create.mockResolvedValue(mockCategory);

      const result = await createCategory({
        name: "General",
        description: "General inquiries",
      });

      expect(result.category).toEqual(mockCategory);
      expect(hoisted.mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });
  });

  describe("updateCategory", () => {
    it("should update a category", async () => {
      const existingCategory = {
        id: "cat_1",
        name: "Technical Support",
        marketCenterId: "market_center_1",
      };

      const updatedCategory = {
        ...existingCategory,
        name: "Tech Support",
        description: "Updated description",
        defaultAssigneeId: "user_1",
        defaultAssignee: {
          id: "user_1",
          name: "Test User",
          email: "test@example.com",
        },
      };

      hoisted.mockPrisma.ticketCategory.findFirst.mockResolvedValue(
        existingCategory
      );
      hoisted.mockPrisma.user.findUnique.mockResolvedValue({ id: "user_1" });
      hoisted.mockPrisma.ticketCategory.findUnique.mockResolvedValue(null);
      hoisted.mockPrisma.ticketCategory.update.mockResolvedValue(
        updatedCategory
      );

      const result = await updateCategory({
        id: "cat_1",
        name: "Tech Support",
        description: "Updated description",
        defaultAssigneeId: "user_1",
      });

      expect(result.category).toEqual(updatedCategory);
    });
  });

  describe("deleteCategory", () => {
    it("should delete a category", async () => {
      const existingCategory = {
        id: "cat_1",
        name: "Technical Support",
        marketCenterId: "market_center_1",
      };

      hoisted.mockPrisma.ticketCategory.findFirst.mockResolvedValue(
        existingCategory
      );
      hoisted.mockPrisma.ticketCategory.delete.mockResolvedValue(
        existingCategory
      );

      const result = await deleteCategory({ id: "cat_1" });

      expect(result.success).toBe(true);
      expect(hoisted.mockPrisma.ticketCategory.delete).toHaveBeenCalledWith({
        where: { id: "cat_1" },
      });
    });
  });

  describe("listCategories", () => {
    it("should list all categories", async () => {
      const mockCategories = [
        {
          id: "cat_1",
          name: "Technical Support",
          description: "Technical issues",
          marketCenterId: "market_center_1",
          defaultAssigneeId: "user_1",
          createdAt: new Date(),
          updatedAt: new Date(),
          defaultAssignee: {
            id: "user_1",
            name: "Test User",
            email: "test@example.com",
          },
        },
        {
          id: "cat_2",
          name: "General",
          description: "General inquiries",
          marketCenterId: "market_center_1",
          defaultAssigneeId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          defaultAssignee: null,
        },
      ];

      hoisted.mockPrisma.ticketCategory.findMany.mockResolvedValue(
        mockCategories
      );

      const result = await listCategories({});

      expect(result.categories).toEqual(mockCategories);
      expect(hoisted.mockPrisma.ticketCategory.findMany).toHaveBeenCalledWith({
        where: {
          marketCenterId: "market_center_1",
        },
        include: {
          defaultAssignee: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          name: "asc",
        },
      });
    });
  });
});
