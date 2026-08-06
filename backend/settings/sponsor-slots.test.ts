import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock hoisted values
const {
  mockMarketCenterRepository,
  mockUserContext,
  subscriptionRepository,
  mockSponsorAssets,
} = vi.hoisted(() => ({
  mockMarketCenterRepository: {
    findById: vi.fn(),
    update: vi.fn(),
    createHistory: vi.fn(),
  },
  mockUserContext: {
    name: "Staff Leader",
    userId: "user-123",
    email: "staffleader@test.com",
    role: "STAFF_LEADER" as const,
    marketCenterId: "mc-123",
    clerkId: "clerk-123",
    isSuperuser: false,
  },
  subscriptionRepository: {
    getSubscriptionById: vi.fn(),
    findByMarketCenterId: vi.fn(),
    getAccessibleMarketCenterIds: vi.fn(),
  },
  mockSponsorAssets: {
    upload: vi.fn(),
    publicUrl: vi.fn((key: string) => `https://cdn.test/${key}`),
  },
}));

// Mock encore.dev/api
vi.mock("encore.dev/api", () => ({
  api: vi.fn((config, handler) => handler),
  APIError: {
    notFound: vi.fn((msg) => {
      const err = new Error(msg);
      (err as any).code = "not_found";
      return err;
    }),
    invalidArgument: vi.fn((msg) => {
      const err = new Error(msg);
      (err as any).code = "invalid_argument";
      return err;
    }),
    permissionDenied: vi.fn((msg) => {
      const err = new Error(msg);
      (err as any).code = "permission_denied";
      return err;
    }),
    internal: vi.fn((msg) => {
      const err = new Error(msg);
      (err as any).code = "internal";
      return err;
    }),
  },
}));

// Mock repositories
vi.mock("../shared/repositories", () => ({
  marketCenterRepository: mockMarketCenterRepository,
  subscriptionRepository: subscriptionRepository,
}));

// Mock user context
vi.mock("../auth/user-context", () => ({
  getUserContext: vi.fn(() => Promise.resolve(mockUserContext)),
}));

// Mock auth/permissions to avoid importing Encore runtime
vi.mock("../auth/permissions", () => ({
  getAccessibleMarketCenterIds: vi.fn((...args: any[]) =>
    subscriptionRepository.getAccessibleMarketCenterIds(...args)
  ),
}));

// Mock the sponsor assets bucket
vi.mock("./sponsor-assets", () => ({
  sponsorAssets: mockSponsorAssets,
}));

// Import after mocks
import {
  getSponsorSlots,
  updateSponsorSlots,
  uploadSponsorAsset,
  getSponsorDisplay,
} from "./sponsor-slots";
import { getUserContext } from "../auth/user-context";

describe("Sponsor Slots Settings API Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSponsorAssets.publicUrl.mockImplementation(
      (key: string) => `https://cdn.test/${key}`
    );
    vi.mocked(getUserContext).mockResolvedValue(mockUserContext);
  });

  describe("getSponsorSlots", () => {
    it("should return sponsor slots for STAFF_LEADER with URL enrichment", async () => {
      const mockMarketCenter = {
        id: "mc-123",
        name: "Test MC",
        settings: {
          sponsorSlots: {
            header: {
              enabled: true,
              name: "Acme Corp",
              imageKey: "mc-123/header/123_logo.png",
              linkUrl: "https://acme.example.com",
            },
          },
        },
      };

      mockMarketCenterRepository.findById.mockResolvedValue(mockMarketCenter);

      const result = await getSponsorSlots({ marketCenterId: "mc-123" });

      expect(result.sponsorSlots.header?.enabled).toBe(true);
      expect(result.sponsorSlots.header?.imageUrl).toBe(
        "https://cdn.test/mc-123/header/123_logo.png"
      );
      expect(mockSponsorAssets.publicUrl).toHaveBeenCalledWith(
        "mc-123/header/123_logo.png"
      );
    });

    it("should throw permission denied for AGENT users", async () => {
      vi.mocked(getUserContext).mockResolvedValue({
        ...mockUserContext,
        role: "AGENT" as const,
      });

      await expect(
        getSponsorSlots({ marketCenterId: "mc-123" })
      ).rejects.toThrow(
        "Only staff leaders and administrators can view sponsor settings"
      );
    });

    it("should throw permission denied for STAFF users", async () => {
      vi.mocked(getUserContext).mockResolvedValue({
        ...mockUserContext,
        role: "STAFF" as const,
      });

      await expect(
        getSponsorSlots({ marketCenterId: "mc-123" })
      ).rejects.toThrow(
        "Only staff leaders and administrators can view sponsor settings"
      );
    });

    it("should throw permission denied when STAFF_LEADER accesses different market center", async () => {
      vi.mocked(getUserContext).mockResolvedValue({
        ...mockUserContext,
        role: "STAFF_LEADER" as const,
        marketCenterId: "mc-123",
      });
      const mockMarketCenter = {
        id: "different-mc",
        name: "Different MC",
        settings: {},
      };

      mockMarketCenterRepository.findById.mockResolvedValue(mockMarketCenter);

      await expect(
        getSponsorSlots({ marketCenterId: "different-mc" })
      ).rejects.toThrow(
        "You do not have access to this market center's settings"
      );
    });

    it("should allow ADMIN to access market centers within their subscription", async () => {
      vi.mocked(getUserContext).mockResolvedValue({
        ...mockUserContext,
        role: "ADMIN" as const,
        marketCenterId: "admin-mc",
      });

      subscriptionRepository.getAccessibleMarketCenterIds.mockResolvedValue([
        "admin-mc",
        "other-mc",
      ]);

      const mockMarketCenter = {
        id: "other-mc",
        name: "Other MC",
        settings: {
          sponsorSlots: {
            dashboardCard: {
              enabled: true,
              imageKey: "other-mc/dashboardCard/1_card.png",
            },
          },
        },
      };

      mockMarketCenterRepository.findById.mockResolvedValue(mockMarketCenter);

      const result = await getSponsorSlots({ marketCenterId: "other-mc" });

      expect(result.sponsorSlots.dashboardCard?.enabled).toBe(true);
      expect(result.sponsorSlots.dashboardCard?.imageUrl).toBe(
        "https://cdn.test/other-mc/dashboardCard/1_card.png"
      );
    });

    it("should throw permission denied for ADMIN without accessible market centers", async () => {
      vi.mocked(getUserContext).mockResolvedValue({
        ...mockUserContext,
        role: "ADMIN" as const,
        marketCenterId: "admin-mc",
      });

      subscriptionRepository.getAccessibleMarketCenterIds.mockResolvedValue(
        []
      );

      const mockMarketCenter = {
        id: "other-mc",
        name: "Other MC",
        settings: {},
      };
      mockMarketCenterRepository.findById.mockResolvedValue(mockMarketCenter);

      await expect(
        getSponsorSlots({ marketCenterId: "other-mc" })
      ).rejects.toThrow(
        "You do not have access to this market center's settings"
      );
    });

    it("should throw not found when market center does not exist", async () => {
      mockMarketCenterRepository.findById.mockResolvedValue(null);

      await expect(
        getSponsorSlots({ marketCenterId: "nonexistent" })
      ).rejects.toThrow("Market center not found");
    });

    it("should return empty object when settings is empty", async () => {
      const mockMarketCenter = {
        id: "mc-123",
        name: "Test MC",
        settings: {},
      };

      mockMarketCenterRepository.findById.mockResolvedValue(mockMarketCenter);

      const result = await getSponsorSlots({ marketCenterId: "mc-123" });

      expect(result.sponsorSlots).toEqual({});
    });
  });

  describe("updateSponsorSlots", () => {
    it("should update sponsor slots successfully, write merged settings and a history entry", async () => {
      const mockMarketCenter = {
        id: "mc-123",
        name: "Test MC",
        settings: {
          autoClose: {
            enabled: true,
            awaitingResponseDays: 3,
          },
        },
      };

      const newSponsorSlots = {
        header: {
          enabled: true,
          name: "Acme Corp",
          imageKey: "mc-123/header/1_logo.png",
          linkUrl: "https://acme.example.com",
        },
      };

      mockMarketCenterRepository.findById.mockResolvedValue(mockMarketCenter);
      mockMarketCenterRepository.update.mockResolvedValue({
        ...mockMarketCenter,
        settings: {
          ...mockMarketCenter.settings,
          sponsorSlots: newSponsorSlots,
        },
      });
      mockMarketCenterRepository.createHistory.mockResolvedValue(undefined);

      const result = await updateSponsorSlots({
        marketCenterId: "mc-123",
        sponsorSlots: newSponsorSlots,
      });

      expect(result.sponsorSlots).toEqual(newSponsorSlots);
      expect(mockMarketCenterRepository.update).toHaveBeenCalledWith(
        "mc-123",
        {
          settings: {
            autoClose: {
              enabled: true,
              awaitingResponseDays: 3,
            },
            sponsorSlots: newSponsorSlots,
          },
        }
      );
      expect(mockMarketCenterRepository.createHistory).toHaveBeenCalledWith({
        marketCenterId: "mc-123",
        action: "UPDATE",
        field: "sponsorSlots",
        previousValue: JSON.stringify(null),
        newValue: JSON.stringify(newSponsorSlots),
        changedById: "user-123",
      });
    });

    it("should preserve other settings keys (e.g. existing autoClose) after the spread", async () => {
      const mockMarketCenter = {
        id: "mc-123",
        name: "Test MC",
        settings: {
          autoClose: { enabled: false, awaitingResponseDays: 5 },
          businessHours: undefined,
        },
      };

      mockMarketCenterRepository.findById.mockResolvedValue(mockMarketCenter);
      mockMarketCenterRepository.update.mockResolvedValue(mockMarketCenter);
      mockMarketCenterRepository.createHistory.mockResolvedValue(undefined);

      await updateSponsorSlots({
        marketCenterId: "mc-123",
        sponsorSlots: {
          ticketListRow: {
            enabled: false,
          },
        },
      });

      expect(mockMarketCenterRepository.update).toHaveBeenCalledWith(
        "mc-123",
        {
          settings: {
            autoClose: { enabled: false, awaitingResponseDays: 5 },
            businessHours: undefined,
            sponsorSlots: {
              ticketListRow: {
                enabled: false,
              },
            },
          },
        }
      );
    });

    it("should reject a slot enabled without an imageKey", async () => {
      const mockMarketCenter = {
        id: "mc-123",
        name: "Test MC",
        settings: {},
      };
      mockMarketCenterRepository.findById.mockResolvedValue(mockMarketCenter);

      await expect(
        updateSponsorSlots({
          marketCenterId: "mc-123",
          sponsorSlots: {
            header: { enabled: true },
          },
        })
      ).rejects.toThrow(
        'Sponsor slot "header" must have an image before it can be enabled'
      );
    });

    it("should reject a non-http(s) linkUrl (ftp://)", async () => {
      const mockMarketCenter = {
        id: "mc-123",
        name: "Test MC",
        settings: {},
      };
      mockMarketCenterRepository.findById.mockResolvedValue(mockMarketCenter);

      await expect(
        updateSponsorSlots({
          marketCenterId: "mc-123",
          sponsorSlots: {
            header: {
              enabled: false,
              imageKey: "mc-123/header/1.png",
              linkUrl: "ftp://acme.example.com",
            },
          },
        })
      ).rejects.toThrow(
        'Sponsor slot "header" linkUrl must start with http:// or https://'
      );
    });

    it("should reject a plain-text linkUrl", async () => {
      const mockMarketCenter = {
        id: "mc-123",
        name: "Test MC",
        settings: {},
      };
      mockMarketCenterRepository.findById.mockResolvedValue(mockMarketCenter);

      await expect(
        updateSponsorSlots({
          marketCenterId: "mc-123",
          sponsorSlots: {
            header: {
              enabled: false,
              linkUrl: "not-a-url",
            },
          },
        })
      ).rejects.toThrow(
        'Sponsor slot "header" linkUrl must start with http:// or https://'
      );
    });

    it("should reject an unknown slot key", async () => {
      const mockMarketCenter = {
        id: "mc-123",
        name: "Test MC",
        settings: {},
      };
      mockMarketCenterRepository.findById.mockResolvedValue(mockMarketCenter);

      await expect(
        updateSponsorSlots({
          marketCenterId: "mc-123",
          sponsorSlots: {
            footer: { enabled: false },
          } as any,
        })
      ).rejects.toThrow("Unknown sponsor slot key: footer");
    });

    it("should reject an imageKey belonging to a different market center", async () => {
      const mockMarketCenter = {
        id: "mc-123",
        name: "Test MC",
        settings: {},
      };
      mockMarketCenterRepository.findById.mockResolvedValue(mockMarketCenter);

      await expect(
        updateSponsorSlots({
          marketCenterId: "mc-123",
          sponsorSlots: {
            header: {
              enabled: false,
              imageKey: "other-mc/header/1.png",
            },
          },
        })
      ).rejects.toThrow(
        'Sponsor slot "header" imageKey must belong to this market center'
      );
    });

    it("should reject a name over 100 characters", async () => {
      const mockMarketCenter = {
        id: "mc-123",
        name: "Test MC",
        settings: {},
      };
      mockMarketCenterRepository.findById.mockResolvedValue(mockMarketCenter);

      await expect(
        updateSponsorSlots({
          marketCenterId: "mc-123",
          sponsorSlots: {
            header: {
              enabled: false,
              name: "a".repeat(101),
            },
          },
        })
      ).rejects.toThrow(
        'Sponsor slot "header" name must be 100 characters or fewer'
      );
    });

    it("should throw permission denied for AGENT users", async () => {
      vi.mocked(getUserContext).mockResolvedValue({
        ...mockUserContext,
        role: "AGENT" as const,
      });

      await expect(
        updateSponsorSlots({
          marketCenterId: "mc-123",
          sponsorSlots: {},
        })
      ).rejects.toThrow(
        "Only staff leaders and administrators can update sponsor settings"
      );
    });

    it("should throw permission denied for STAFF users", async () => {
      vi.mocked(getUserContext).mockResolvedValue({
        ...mockUserContext,
        role: "STAFF" as const,
      });

      await expect(
        updateSponsorSlots({
          marketCenterId: "mc-123",
          sponsorSlots: {},
        })
      ).rejects.toThrow(
        "Only staff leaders and administrators can update sponsor settings"
      );
    });

    it("should throw not found when market center does not exist", async () => {
      mockMarketCenterRepository.findById.mockResolvedValue(null);

      await expect(
        updateSponsorSlots({
          marketCenterId: "nonexistent",
          sponsorSlots: {},
        })
      ).rejects.toThrow("Market center not found");
    });

    it("should throw permission denied when STAFF_LEADER updates a different market center", async () => {
      vi.mocked(getUserContext).mockResolvedValue({
        ...mockUserContext,
        role: "STAFF_LEADER" as const,
        marketCenterId: "mc-123",
      });
      const mockMarketCenter = {
        id: "different-mc",
        name: "Different MC",
        settings: {},
      };

      mockMarketCenterRepository.findById.mockResolvedValue(mockMarketCenter);

      await expect(
        updateSponsorSlots({
          marketCenterId: "different-mc",
          sponsorSlots: {},
        })
      ).rejects.toThrow(
        "You do not have access to this market center's settings"
      );
      expect(mockMarketCenterRepository.update).not.toHaveBeenCalled();
    });
  });

  describe("uploadSponsorAsset", () => {
    const validBase64 = Buffer.from("fake-image-bytes").toString("base64");

    it("should upload successfully and return imageKey with correct prefix and imageUrl", async () => {
      const mockMarketCenter = {
        id: "mc-123",
        name: "Test MC",
        settings: {},
      };
      mockMarketCenterRepository.findById.mockResolvedValue(mockMarketCenter);
      mockSponsorAssets.upload.mockResolvedValue({
        name: "key",
        size: 10,
        etag: "abc",
      });

      const result = await uploadSponsorAsset({
        marketCenterId: "mc-123",
        slot: "header",
        fileName: "logo.png",
        mimeType: "image/png",
        content: validBase64,
      });

      expect(result.imageKey.startsWith("mc-123/header/")).toBe(true);
      expect(result.imageUrl).toBe(`https://cdn.test/${result.imageKey}`);
      expect(mockSponsorAssets.upload).toHaveBeenCalledWith(
        result.imageKey,
        expect.any(Buffer),
        { contentType: "image/png" }
      );
    });

    it("should reject SVG mime type", async () => {
      const mockMarketCenter = {
        id: "mc-123",
        name: "Test MC",
        settings: {},
      };
      mockMarketCenterRepository.findById.mockResolvedValue(mockMarketCenter);

      await expect(
        uploadSponsorAsset({
          marketCenterId: "mc-123",
          slot: "header",
          fileName: "logo.svg",
          mimeType: "image/svg+xml",
          content: validBase64,
        })
      ).rejects.toThrow(
        "File type not allowed. Allowed types: PNG, JPEG, WebP, GIF"
      );
    });

    it("should reject a decoded buffer over 5MB", async () => {
      const mockMarketCenter = {
        id: "mc-123",
        name: "Test MC",
        settings: {},
      };
      mockMarketCenterRepository.findById.mockResolvedValue(mockMarketCenter);

      const oversizedBuffer = Buffer.alloc(5 * 1024 * 1024 + 1, 1);
      const oversizedBase64 = oversizedBuffer.toString("base64");

      await expect(
        uploadSponsorAsset({
          marketCenterId: "mc-123",
          slot: "header",
          fileName: "big.png",
          mimeType: "image/png",
          content: oversizedBase64,
        })
      ).rejects.toThrow(
        "File size exceeds maximum allowed size of 5MB"
      );
      expect(mockSponsorAssets.upload).not.toHaveBeenCalled();
    });

    it("should throw permission denied when STAFF_LEADER uploads for a different market center", async () => {
      vi.mocked(getUserContext).mockResolvedValue({
        ...mockUserContext,
        role: "STAFF_LEADER" as const,
        marketCenterId: "mc-123",
      });
      const mockMarketCenter = {
        id: "different-mc",
        name: "Different MC",
        settings: {},
      };
      mockMarketCenterRepository.findById.mockResolvedValue(mockMarketCenter);

      await expect(
        uploadSponsorAsset({
          marketCenterId: "different-mc",
          slot: "header",
          fileName: "logo.png",
          mimeType: "image/png",
          content: validBase64,
        })
      ).rejects.toThrow(
        "You do not have access to this market center's settings"
      );
      expect(mockSponsorAssets.upload).not.toHaveBeenCalled();
    });

    it("should throw permission denied for AGENT users", async () => {
      vi.mocked(getUserContext).mockResolvedValue({
        ...mockUserContext,
        role: "AGENT" as const,
      });

      await expect(
        uploadSponsorAsset({
          marketCenterId: "mc-123",
          slot: "header",
          fileName: "logo.png",
          mimeType: "image/png",
          content: validBase64,
        })
      ).rejects.toThrow(
        "Only staff leaders and administrators can upload sponsor assets"
      );
    });
  });

  describe("getSponsorDisplay", () => {
    it("should return only enabled slots with an imageKey", async () => {
      vi.mocked(getUserContext).mockResolvedValue({
        ...mockUserContext,
        role: "AGENT" as const,
        marketCenterId: "mc-123",
      });

      const mockMarketCenter = {
        id: "mc-123",
        name: "Test MC",
        settings: {
          sponsorSlots: {
            header: {
              enabled: true,
              name: "Acme",
              imageKey: "mc-123/header/1.png",
              linkUrl: "https://acme.example.com",
            },
            dashboardCard: {
              enabled: false,
              imageKey: "mc-123/dashboardCard/1.png",
            },
            ticketListRow: {
              enabled: true,
            },
          },
        },
      };
      mockMarketCenterRepository.findById.mockResolvedValue(mockMarketCenter);

      const result = await getSponsorDisplay();

      expect(result.slots).toEqual([
        {
          slot: "header",
          name: "Acme",
          imageUrl: "https://cdn.test/mc-123/header/1.png",
          linkUrl: "https://acme.example.com",
        },
      ]);
    });

    it("should return empty for a user without a marketCenterId", async () => {
      vi.mocked(getUserContext).mockResolvedValue({
        ...mockUserContext,
        role: "AGENT" as const,
        marketCenterId: null,
      });

      const result = await getSponsorDisplay();

      expect(result.slots).toEqual([]);
      expect(mockMarketCenterRepository.findById).not.toHaveBeenCalled();
    });

    it("should return empty when market center has no sponsorSlots", async () => {
      vi.mocked(getUserContext).mockResolvedValue({
        ...mockUserContext,
        role: "AGENT" as const,
        marketCenterId: "mc-123",
      });

      mockMarketCenterRepository.findById.mockResolvedValue({
        id: "mc-123",
        name: "Test MC",
        settings: {},
      });

      const result = await getSponsorDisplay();

      expect(result.slots).toEqual([]);
    });

    it("should return empty when market center is not found", async () => {
      vi.mocked(getUserContext).mockResolvedValue({
        ...mockUserContext,
        role: "AGENT" as const,
        marketCenterId: "mc-123",
      });

      mockMarketCenterRepository.findById.mockResolvedValue(null);

      const result = await getSponsorDisplay();

      expect(result.slots).toEqual([]);
    });

    it("should allow AGENT role to read successfully (not denied)", async () => {
      vi.mocked(getUserContext).mockResolvedValue({
        ...mockUserContext,
        role: "AGENT" as const,
        marketCenterId: "mc-123",
      });

      mockMarketCenterRepository.findById.mockResolvedValue({
        id: "mc-123",
        name: "Test MC",
        settings: {
          sponsorSlots: {
            ticketListRow: {
              enabled: true,
              imageKey: "mc-123/ticketListRow/1.png",
            },
          },
        },
      });

      await expect(getSponsorDisplay()).resolves.toBeDefined();
    });
  });
});
