import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock hoisted values
const {
  mockTicketRepository,
  mockUserMarketCenterRepository,
  mockGetAccessibleMarketCenterIds,
  mockUserContext,
} = vi.hoisted(() => ({
  mockTicketRepository: {
    findAssignees: vi.fn(),
  },
  mockUserMarketCenterRepository: {
    userBelongsToMarketCenter: vi.fn(),
  },
  mockGetAccessibleMarketCenterIds: vi.fn(),
  mockUserContext: {
    name: "Test User",
    userId: "user-123",
    email: "user@test.com",
    role: "ADMIN" as const,
    marketCenterId: "mc-123",
    clerkId: "clerk-123",
    isSuperuser: false,
  },
}));

// Mock encore.dev/api
vi.mock("encore.dev/api", () => ({
  api: vi.fn((config, handler) => handler),
  APIError: {
    notFound: vi.fn((msg) => new Error(msg)),
    invalidArgument: vi.fn((msg) => new Error(msg)),
    permissionDenied: vi.fn((msg) => new Error(msg)),
  },
}));

// Mock ticket/db
vi.mock("./db", () => ({
  ticketRepository: mockTicketRepository,
}));

// Mock user context
vi.mock("../auth/user-context", () => ({
  getUserContext: vi.fn(() => Promise.resolve(mockUserContext)),
}));

// Mock permissions
vi.mock("../auth/permissions", () => ({
  getAccessibleMarketCenterIds: mockGetAccessibleMarketCenterIds,
}));

// Mock user-market-center repository
vi.mock("../shared/repositories/user-market-center.repository", () => ({
  userMarketCenterRepository: mockUserMarketCenterRepository,
}));

// Import after mocks
import { listTicketAssignees } from "./list-assignees";
import { getUserContext } from "../auth/user-context";

describe("listTicketAssignees", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getUserContext).mockResolvedValue(mockUserContext);
    mockGetAccessibleMarketCenterIds.mockResolvedValue(["mc-123"]);
    mockTicketRepository.findAssignees.mockResolvedValue([]);
  });

  it("returns an empty result set when the caller has no accessible market centers", async () => {
    mockGetAccessibleMarketCenterIds.mockResolvedValue([]);

    const result = await listTicketAssignees({});

    expect(result).toEqual({ assignees: [] });
    expect(mockTicketRepository.findAssignees).not.toHaveBeenCalled();
  });

  it("returns an empty array when no ticket has an assignee in scope", async () => {
    mockTicketRepository.findAssignees.mockResolvedValue([]);

    const result = await listTicketAssignees({});

    expect(result).toEqual({ assignees: [] });
  });

  describe("ADMIN scoping", () => {
    beforeEach(() => {
      vi.mocked(getUserContext).mockResolvedValue({
        ...mockUserContext,
        role: "ADMIN",
      });
    });

    it("scopes to the requested marketCenterId when it is accessible", async () => {
      mockGetAccessibleMarketCenterIds.mockResolvedValue(["mc-123", "mc-456"]);

      await listTicketAssignees({ marketCenterId: "mc-456" });

      expect(mockTicketRepository.findAssignees).toHaveBeenCalledWith(
        expect.objectContaining({
          userRole: "ADMIN",
          marketCenterIds: ["mc-456"],
        })
      );
    });

    it("falls back to all accessible market centers when marketCenterId is omitted", async () => {
      mockGetAccessibleMarketCenterIds.mockResolvedValue(["mc-123", "mc-456"]);

      await listTicketAssignees({});

      expect(mockTicketRepository.findAssignees).toHaveBeenCalledWith(
        expect.objectContaining({
          userRole: "ADMIN",
          marketCenterIds: ["mc-123", "mc-456"],
        })
      );
    });

    it("falls back to all accessible market centers when the requested marketCenterId is not accessible", async () => {
      mockGetAccessibleMarketCenterIds.mockResolvedValue(["mc-123"]);

      await listTicketAssignees({ marketCenterId: "mc-999" });

      expect(mockTicketRepository.findAssignees).toHaveBeenCalledWith(
        expect.objectContaining({
          userRole: "ADMIN",
          marketCenterIds: ["mc-123"],
        })
      );
    });

    it("includes agent-role and inactive assignees returned by the repository", async () => {
      mockTicketRepository.findAssignees.mockResolvedValue([
        { id: "u-1", name: "April Huang", role: "AGENT", isActive: false },
        { id: "u-2", name: "Bob Staff", role: "STAFF", isActive: true },
      ]);

      const result = await listTicketAssignees({});

      expect(result.assignees).toEqual([
        { id: "u-1", name: "April Huang", role: "AGENT", isActive: false },
        { id: "u-2", name: "Bob Staff", role: "STAFF", isActive: true },
      ]);
    });
  });

  describe("STAFF_LEADER scoping", () => {
    beforeEach(() => {
      vi.mocked(getUserContext).mockResolvedValue({
        ...mockUserContext,
        role: "STAFF_LEADER",
        marketCenterId: "mc-own",
      });
      mockGetAccessibleMarketCenterIds.mockResolvedValue(["mc-own"]);
    });

    it("scopes to the caller's own market center when no marketCenterId is requested", async () => {
      await listTicketAssignees({});

      expect(mockTicketRepository.findAssignees).toHaveBeenCalledWith(
        expect.objectContaining({
          userRole: "STAFF_LEADER",
          marketCenterIds: ["mc-own"],
        })
      );
    });

    it("scopes to the requested marketCenterId when the caller belongs to it", async () => {
      mockUserMarketCenterRepository.userBelongsToMarketCenter.mockResolvedValue(
        true
      );

      await listTicketAssignees({ marketCenterId: "mc-other" });

      expect(mockTicketRepository.findAssignees).toHaveBeenCalledWith(
        expect.objectContaining({
          marketCenterIds: ["mc-other"],
        })
      );
    });

    it("falls back to the caller's own market center when they do not belong to the requested one", async () => {
      mockUserMarketCenterRepository.userBelongsToMarketCenter.mockResolvedValue(
        false
      );

      await listTicketAssignees({ marketCenterId: "mc-other" });

      expect(mockTicketRepository.findAssignees).toHaveBeenCalledWith(
        expect.objectContaining({
          marketCenterIds: ["mc-own"],
        })
      );
    });
  });

  describe("STAFF scoping", () => {
    beforeEach(() => {
      vi.mocked(getUserContext).mockResolvedValue({
        ...mockUserContext,
        role: "STAFF",
        userId: "staff-1",
        marketCenterId: "mc-own",
      });
      mockGetAccessibleMarketCenterIds.mockResolvedValue(["mc-own"]);
    });

    it("scopes to the caller's own market center, not the whole system", async () => {
      await listTicketAssignees({});

      expect(mockTicketRepository.findAssignees).toHaveBeenCalledWith({
        userId: "staff-1",
        userRole: "STAFF",
        marketCenterIds: ["mc-own"],
      });
    });

    it("only surfaces assignees the repository says are in the staff member's scope", async () => {
      mockTicketRepository.findAssignees.mockResolvedValue([
        { id: "u-in-scope", name: "In Scope", role: "STAFF", isActive: true },
      ]);

      const result = await listTicketAssignees({});

      expect(result.assignees).toEqual([
        { id: "u-in-scope", name: "In Scope", role: "STAFF", isActive: true },
      ]);
      // The scoping decision is delegated entirely to the repository call
      // above, mirroring the same marketCenterIds the ticket list search
      // uses for this role - a STAFF caller can never expand it here.
      expect(mockTicketRepository.findAssignees).toHaveBeenCalledWith(
        expect.objectContaining({ marketCenterIds: ["mc-own"] })
      );
    });
  });

  describe("AGENT scoping", () => {
    beforeEach(() => {
      vi.mocked(getUserContext).mockResolvedValue({
        ...mockUserContext,
        role: "AGENT",
        userId: "agent-1",
        marketCenterId: "mc-own",
      });
      mockGetAccessibleMarketCenterIds.mockResolvedValue(["mc-own"]);
    });

    it("passes the caller's own userId and role regardless of marketCenterId", async () => {
      await listTicketAssignees({ marketCenterId: "mc-other" });

      expect(mockTicketRepository.findAssignees).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "agent-1",
          userRole: "AGENT",
        })
      );
    });

    it("returns assignees of the agent's own created tickets", async () => {
      mockTicketRepository.findAssignees.mockResolvedValue([
        { id: "staff-1", name: "Helper", role: "STAFF", isActive: true },
      ]);

      const result = await listTicketAssignees({});

      expect(result.assignees).toEqual([
        { id: "staff-1", name: "Helper", role: "STAFF", isActive: true },
      ]);
    });
  });

  it("returns a distinct list (deduping is delegated to the repository query)", async () => {
    mockTicketRepository.findAssignees.mockResolvedValue([
      { id: "u-1", name: "April Huang", role: "STAFF", isActive: true },
    ]);

    const result = await listTicketAssignees({});

    expect(result.assignees).toHaveLength(1);
    expect(mockTicketRepository.findAssignees).toHaveBeenCalledTimes(1);
  });
});
