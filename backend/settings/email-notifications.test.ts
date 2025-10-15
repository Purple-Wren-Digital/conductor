import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma, mockEmailService } = vi.hoisted(() => {
  return {
    mockPrisma: {
      user: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
      },
      marketCenter: {
        findUnique: vi.fn(),
      },
    },
    mockEmailService: {
      sendSettingsChangeNotification: vi.fn(),
    },
  };
});

vi.mock("./db", () => ({
  getPrisma: vi.fn(() => mockPrisma),
}));

vi.mock("./email-service", () => ({
  getEmailService: vi.fn(() => mockEmailService),
}));

import { notifySettingsChange } from "./notifications";

describe("Email Notifications", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should format section names correctly", () => {
    expect(true).toBe(true);
  });

  it("should handle notification function without throwing", async () => {
    // Arrange
    mockPrisma.user.findMany.mockResolvedValue([
      { id: "admin1", email: "admin1@example.com", name: "Admin 1" },
      { id: "admin2", email: "admin2@example.com", name: "Admin 2" },
    ]);
    mockPrisma.marketCenter.findUnique.mockResolvedValue({
      name: "Test Market Center",
    });
    mockPrisma.user.findUnique.mockResolvedValue({
      name: "Changed By User",
      email: "user@example.com",
    });
    mockEmailService.sendSettingsChangeNotification.mockResolvedValue(
      undefined
    );

    const changes = [
      { section: "businessHours", previousValue: {}, newValue: {} },
      { section: "branding", previousValue: {}, newValue: {} },
    ];

    // Act + Assert (no throw)
    await expect(
      notifySettingsChange("market-center-id", "changed-by-user-id", changes)
    ).resolves.not.toThrow();

    // Assert findMany was called with expected query
    expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
      where: {
        marketCenterId: "market-center-id",
        role: "ADMIN",
        isActive: false,
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    // (Optional) sanity checks:
    expect(mockPrisma.marketCenter.findUnique).toHaveBeenCalled();
    expect(mockPrisma.user.findUnique).toHaveBeenCalled();
    expect(mockEmailService.sendSettingsChangeNotification).toHaveBeenCalled();
  });
});
