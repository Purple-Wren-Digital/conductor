import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("encore.dev/api", () => ({
  api: vi.fn((config, handler) => handler),
  APIError: {
    notFound: vi.fn((msg) => new Error(msg)),
    invalidArgument: vi.fn((msg) => new Error(msg)),
  },
}));

vi.mock("./db", () => ({
  prisma: {
    order: { count: vi.fn().mockResolvedValue(5) },
    user: { count: vi.fn().mockResolvedValue(12) },
    payment: {
      aggregate: vi.fn().mockResolvedValue({ _sum: { amount: 12345 } }),
    },
  },
}));

import { getDashboardData } from "./dashboard";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getDashboardData", () => {
  it("should return dashboard data", async () => {
    const dashboardData = await getDashboardData();
    expect(dashboardData.totalOrders).toBeGreaterThan(0);
    expect(dashboardData.totalRevenue).toBeGreaterThan(0);
    expect(dashboardData.totalUsers).toBeGreaterThan(0);
  });
});
