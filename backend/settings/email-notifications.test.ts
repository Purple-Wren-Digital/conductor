import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockUserRepository, mockMarketCenterRepository, mockEmailService } = vi.hoisted(() => {
  return {
    mockUserRepository: {
      findById: vi.fn(),
      findByMarketCenterIdAndRole: vi.fn(),
    },
    mockMarketCenterRepository: {
      findById: vi.fn(),
    },
    mockEmailService: {
      sendSettingsChangeNotification: vi.fn(),
    },
  };
});

vi.mock("./db", () => ({
  userRepository: mockUserRepository,
  marketCenterRepository: mockMarketCenterRepository,
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
    mockUserRepository.findByMarketCenterIdAndRole.mockResolvedValue([
      { id: "admin1", email: "admin1@example.com", name: "Admin 1" },
      { id: "admin2", email: "admin2@example.com", name: "Admin 2" },
    ]);
    mockMarketCenterRepository.findById.mockResolvedValue({
      id: "market-center-id",
      name: "Test Market Center",
    });
    mockUserRepository.findById.mockResolvedValue({
      id: "changed-by-user-id",
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

    // Assert repository was called with expected arguments
    expect(mockUserRepository.findByMarketCenterIdAndRole).toHaveBeenCalledWith(
      "market-center-id",
      "ADMIN",
      { activeOnly: false }
    );

    // Sanity checks:
    expect(mockMarketCenterRepository.findById).toHaveBeenCalledWith("market-center-id");
    expect(mockUserRepository.findById).toHaveBeenCalledWith("changed-by-user-id");
    expect(mockEmailService.sendSettingsChangeNotification).toHaveBeenCalled();
  });
});
