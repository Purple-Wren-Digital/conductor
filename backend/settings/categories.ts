import { api, APIError } from "encore.dev/api";
import { getPrisma } from "./db";

const prisma = getPrisma();

export interface TicketCategory {
  id: string;
  name: string;
  description?: string;
  // marketCenterId: string | null;
  defaultAssigneeId: string | null;
  defaultAssignee: {
    id: string;
    name: string;
    email: string;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCategoryRequest {
  name: string;
  description?: string;
  defaultAssigneeId?: string;
}

export interface CreateCategoryResponse {
  category: TicketCategory;
}

export interface UpdateCategoryRequest {
  name?: string;
  description?: string;
  defaultAssigneeId?: string;
}

export interface UpdateCategoryResponse {
  category: TicketCategory;
}

export interface DeleteCategoryResponse {
  success: boolean;
}

export interface ListCategoriesResponse {
  categories: TicketCategory[];
}

export const createCategory = api<
  CreateCategoryRequest,
  CreateCategoryResponse
>(
  {
    expose: true,
    method: "POST",
    path: "/settings/categories",
    auth: true,
  },
  async (req) => {
    // TODO: Get market center from auth context
    const mockMarketCenterId = "market_center_1";

    // Validate default assignee exists if provided
    if (req.defaultAssigneeId) {
      const assignee = await prisma.user.findUnique({
        where: { id: req.defaultAssigneeId },
      });
      if (!assignee) {
        throw APIError.notFound("Default assignee not found");
      }
    }

    // Check if category name already exists in this market center
    const existingCategory = await prisma.ticketCategory.findUnique({
      where: {
        marketCenterId_name: {
          marketCenterId: mockMarketCenterId,
          name: req.name,
        },
      },
    });

    if (existingCategory) {
      throw APIError.invalidArgument("Category name already exists");
    }

    const category = await prisma.ticketCategory.create({
      data: {
        name: req.name,
        description: req.description,
        marketCenterId: mockMarketCenterId,
        defaultAssigneeId: req.defaultAssigneeId,
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

    // Ensure description is never null
    const safeCategory = {
      ...category,
      description: category.description ?? undefined,
      defaultAssigneeId: category.defaultAssigneeId ?? null,
      defaultAssignee: category.defaultAssignee
        ? {
            ...category.defaultAssignee,
            name: category.defaultAssignee.name ?? "",
          }
        : null,
    };

    return { category: safeCategory };
  }
);

export const updateCategory = api<
  { id: string } & UpdateCategoryRequest,
  UpdateCategoryResponse
>(
  {
    expose: true,
    method: "PUT",
    path: "/settings/categories/:id",
    auth: true,
  },
  async (req) => {
    // TODO: Get market center from auth context
    const mockMarketCenterId = "market_center_1";

    // Check if category exists and belongs to this market center
    const existingCategory = await prisma.ticketCategory.findFirst({
      where: {
        id: req.id,
        marketCenterId: mockMarketCenterId,
      },
    });

    if (!existingCategory) {
      throw APIError.notFound("Category not found");
    }

    // Validate default assignee exists if provided
    if (req.defaultAssigneeId) {
      const assignee = await prisma.user.findUnique({
        where: { id: req.defaultAssigneeId },
      });
      if (!assignee) {
        throw APIError.notFound("Default assignee not found");
      }
    }

    // Check if new name conflicts with existing categories
    if (req.name && req.name !== existingCategory.name) {
      const nameConflict = await prisma.ticketCategory.findUnique({
        where: {
          marketCenterId_name: {
            marketCenterId: mockMarketCenterId,
            name: req.name,
          },
        },
      });

      if (nameConflict) {
        throw APIError.invalidArgument("Category name already exists");
      }
    }

    const category = await prisma.ticketCategory.update({
      where: { id: req.id },
      data: {
        name: req.name,
        description: req.description,
        defaultAssigneeId: req.defaultAssigneeId,
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

    const safeCategory = {
      ...category,
      description: category.description ?? undefined,
      defaultAssigneeId: category.defaultAssigneeId ?? null,
      defaultAssignee: category.defaultAssignee
        ? {
            ...category.defaultAssignee,
            name: category.defaultAssignee.name ?? "",
          }
        : null,
    };

    return { category: safeCategory };
  }
);

export const deleteCategory = api<{ id: string }, DeleteCategoryResponse>(
  {
    expose: true,
    method: "DELETE",
    path: "/settings/categories/:id",
    auth: true,
  },
  async (req) => {
    // TODO: Get market center from auth context
    const mockMarketCenterId = "market_center_1";

    // Check if category exists and belongs to this market center
    const existingCategory = await prisma.ticketCategory.findFirst({
      where: {
        id: req.id,
        marketCenterId: mockMarketCenterId,
      },
    });

    if (!existingCategory) {
      throw APIError.notFound("Category not found");
    }

    await prisma.ticketCategory.delete({
      where: { id: req.id },
    });

    return { success: true };
  }
);

export const listCategories = api<{}, ListCategoriesResponse>(
  {
    expose: true,
    method: "GET",
    path: "/settings/categories",
    auth: true,
  },
  async () => {
    // TODO: Get market center from auth context
    const mockMarketCenterId = "market_center_1";

    const categoriesFound = await prisma.ticketCategory.findMany({
      where: {
        marketCenterId: mockMarketCenterId,
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

    const categories = categoriesFound.map((cat) => ({
      ...cat,
      description: cat.description ?? undefined,
      defaultAssigneeId: cat.defaultAssigneeId ?? null,
      defaultAssignee: cat.defaultAssignee
        ? {
            ...cat.defaultAssignee,
            name: cat.defaultAssignee.name ?? "",
          }
        : null,
    }));

    return { categories: categories };
  }
);
