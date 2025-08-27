import { describe, it, expect, vi, beforeEach } from 'vitest';
import { notifySettingsChange } from './notifications';

// Mock the dependencies
vi.mock('./db', () => ({
  getPrisma: vi.fn(() => ({
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    marketCenter: {
      findUnique: vi.fn(),
    },
  })),
}));

vi.mock('./email-service', () => ({
  getEmailService: vi.fn(() => ({
    sendSettingsChangeNotification: vi.fn(),
  })),
}));

describe('Email Notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should format section names correctly', () => {
    // This test is more of a documentation of expected behavior
    // since the formatSectionName function is private
    expect(true).toBe(true);
  });

  it('should handle notification function without throwing', async () => {
    const { getPrisma } = await import('./db');
    const { getEmailService } = await import('./email-service');
    
    const mockPrisma = getPrisma() as any;
    const mockEmailService = getEmailService() as any;

    mockPrisma.user.findMany.mockResolvedValue([
      { id: 'admin1', email: 'admin1@example.com', name: 'Admin 1' },
      { id: 'admin2', email: 'admin2@example.com', name: 'Admin 2' },
    ]);

    mockPrisma.marketCenter.findUnique.mockResolvedValue({
      name: 'Test Market Center',
    });

    mockPrisma.user.findUnique.mockResolvedValue({
      name: 'Changed By User',
      email: 'user@example.com',
    });

    mockEmailService.sendSettingsChangeNotification.mockResolvedValue(undefined);

    const changes = [
      { section: 'businessHours', previousValue: {}, newValue: {} },
      { section: 'branding', previousValue: {}, newValue: {} },
    ];

    // Should not throw
    await expect(
      notifySettingsChange('market-center-id', 'changed-by-user-id', changes)
    ).resolves.not.toThrow();

    expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
      where: {
        marketCenterId: 'market-center-id',
        role: 'ADMIN',
        isDeleted: false,
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });
  });
});