import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock hoisted values
const { mockSurveyRepository, mockTicketRepository, mockUserContext } = vi.hoisted(() => ({
  mockSurveyRepository: {
    findById: vi.fn(),
    findByIdWithRelations: vi.fn(),
    findByTicketId: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteByTicketId: vi.fn(),
    getAllAverages: vi.fn(),
    getAssigneeAverages: vi.fn(),
    getMarketCenterAverages: vi.fn(),
    hasCompletedSurveysForAssignee: vi.fn(),
    hasCompletedSurveysForMarketCenter: vi.fn(),
  },
  mockTicketRepository: {
    findByIdWithRelations: vi.fn(),
  },
  mockUserContext: {
    userId: "user-123",
    role: "ADMIN",
    marketCenterId: "mc-123",
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
  },
}));

// Mock the ticket/db module that exports repositories
vi.mock("../ticket/db", () => ({
  surveyRepository: mockSurveyRepository,
  ticketRepository: mockTicketRepository,
}));

// Mock user context
vi.mock("../auth/user-context", () => ({
  getUserContext: vi.fn(() => Promise.resolve(mockUserContext)),
}));

// Import after mocks
import { get } from "./get";
import { createSurvey } from "./create";
import { update } from "./update";
import { deleteSurvey } from "./delete";
import { getAllRatings } from "./get-ratings-all";
import { getRatingsByAssignee } from "./get-ratings-by-assignee";
import { getByMarketCenter } from "./get-ratings-by-market-center";
import { getUserContext } from "../auth/user-context";

describe("Survey Service Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset default user context
    vi.mocked(getUserContext).mockResolvedValue(mockUserContext);
  });

  describe("get", () => {
    it("should return a survey when found", async () => {
      const mockSurvey = {
        id: "survey-123",
        ticketId: "ticket-123",
        surveyorId: "user-456",
        assigneeId: "user-789",
        marketCenterId: "mc-123",
        overallRating: 5,
        assigneeRating: 4,
        marketCenterRating: 5,
        completed: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockSurveyRepository.findByIdWithRelations.mockResolvedValue(mockSurvey);

      const result = await get({ surveyId: "survey-123" });

      expect(result.survey).toEqual(mockSurvey);
      expect(mockSurveyRepository.findByIdWithRelations).toHaveBeenCalledWith("survey-123");
    });

    it("should throw not found when survey does not exist", async () => {
      mockSurveyRepository.findByIdWithRelations.mockResolvedValue(null);

      await expect(get({ surveyId: "nonexistent" })).rejects.toThrow(
        "Survey not found"
      );
    });

    it("should throw invalid argument when surveyId is missing", async () => {
      await expect(get({ surveyId: "" })).rejects.toThrow(
        "Survey Id is required"
      );
    });
  });

  describe("createSurvey", () => {
    it("should create a survey successfully", async () => {
      const mockTicket = {
        id: "ticket-123",
        assigneeId: "user-789",
        assignee: { marketCenterId: "mc-123" },
        category: { marketCenterId: null },
        creator: { marketCenterId: null },
      };

      mockTicketRepository.findByIdWithRelations.mockResolvedValue(mockTicket);
      mockSurveyRepository.create.mockResolvedValue({ id: "survey-new" });

      const result = await createSurvey({
        ticketId: "ticket-123",
        surveyorId: "user-456",
      });

      expect(result.success).toBe(true);
      expect(mockSurveyRepository.create).toHaveBeenCalledWith({
        ticketId: "ticket-123",
        surveyorId: "user-456",
        assigneeId: "user-789",
        marketCenterId: "mc-123",
      });
    });

    it("should use provided marketCenterId over derived ones", async () => {
      const mockTicket = {
        id: "ticket-123",
        assigneeId: "user-789",
        assignee: { marketCenterId: "derived-mc" },
        category: null,
        creator: null,
      };

      mockTicketRepository.findByIdWithRelations.mockResolvedValue(mockTicket);
      mockSurveyRepository.create.mockResolvedValue({ id: "survey-new" });

      await createSurvey({
        ticketId: "ticket-123",
        surveyorId: "user-456",
        marketCenterId: "provided-mc",
      });

      expect(mockSurveyRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ marketCenterId: "provided-mc" })
      );
    });

    it("should throw not found when ticket does not exist", async () => {
      mockTicketRepository.findByIdWithRelations.mockResolvedValue(null);

      await expect(
        createSurvey({ ticketId: "nonexistent", surveyorId: "user-456" })
      ).rejects.toThrow("Ticket not found");
    });

    it("should throw invalid argument when missing required fields", async () => {
      await expect(
        createSurvey({ ticketId: "", surveyorId: "user-456" })
      ).rejects.toThrow("Missing data");

      await expect(
        createSurvey({ ticketId: "ticket-123", surveyorId: "" })
      ).rejects.toThrow("Missing data");
    });

    it("should throw not found when no market center can be determined", async () => {
      const mockTicket = {
        id: "ticket-123",
        assigneeId: null,
        assignee: null,
        category: null,
        creator: null,
      };

      mockTicketRepository.findByIdWithRelations.mockResolvedValue(mockTicket);

      await expect(
        createSurvey({ ticketId: "ticket-123", surveyorId: "user-456" })
      ).rejects.toThrow("Market Center not found");
    });
  });

  describe("update", () => {
    it("should update a survey successfully", async () => {
      const mockSurvey = {
        id: "survey-123",
        surveyorId: "user-123", // matches mockUserContext.userId
        overallRating: 3,
        assigneeRating: 3,
        marketCenterRating: 3,
        comment: null,
      };

      mockSurveyRepository.findByTicketId.mockResolvedValue(mockSurvey);
      mockSurveyRepository.update.mockResolvedValue(mockSurvey);

      const result = await update({
        ticketId: "ticket-123",
        overallRating: 5,
        assigneeRating: 4,
        marketCenterRating: 5,
        comments: "Great service!",
      });

      expect(result.success).toBe(true);
      expect(mockSurveyRepository.update).toHaveBeenCalledWith("survey-123", {
        overallRating: 5,
        assigneeRating: 4,
        marketCenterRating: 5,
        comment: "Great service!",
        completed: true,
      });
    });

    it("should throw not found when survey does not exist", async () => {
      mockSurveyRepository.findByTicketId.mockResolvedValue(null);

      await expect(
        update({
          ticketId: "nonexistent",
          overallRating: 5,
          assigneeRating: 4,
          marketCenterRating: 5,
        })
      ).rejects.toThrow("Survey not found");
    });

    it("should throw permission denied when user is not the surveyor", async () => {
      const mockSurvey = {
        id: "survey-123",
        surveyorId: "different-user", // does not match mockUserContext.userId
      };

      mockSurveyRepository.findByTicketId.mockResolvedValue(mockSurvey);

      await expect(
        update({
          ticketId: "ticket-123",
          overallRating: 5,
          assigneeRating: 4,
          marketCenterRating: 5,
        })
      ).rejects.toThrow("You do not have permission to update this survey");
    });

    it("should throw invalid argument when ticketId is missing", async () => {
      await expect(
        update({
          ticketId: "",
          overallRating: 5,
          assigneeRating: 4,
          marketCenterRating: 5,
        })
      ).rejects.toThrow("Ticket ID is required");
    });
  });

  describe("deleteSurvey", () => {
    it("should delete a survey successfully", async () => {
      const mockSurvey = { id: "survey-123" };

      mockSurveyRepository.findByTicketId.mockResolvedValue(mockSurvey);
      mockSurveyRepository.delete.mockResolvedValue(undefined);

      const result = await deleteSurvey({ ticketId: "ticket-123" });

      expect(result.success).toBe(true);
      expect(mockSurveyRepository.delete).toHaveBeenCalledWith("survey-123");
    });

    it("should throw not found when survey does not exist", async () => {
      mockSurveyRepository.findByTicketId.mockResolvedValue(null);

      await expect(deleteSurvey({ ticketId: "nonexistent" })).rejects.toThrow(
        "Survey not found"
      );
    });

    it("should throw invalid argument when ticketId is missing", async () => {
      await expect(deleteSurvey({ ticketId: "" })).rejects.toThrow(
        "Ticket ID is required"
      );
    });
  });

  describe("getAllRatings", () => {
    it("should return all ratings for admin users", async () => {
      const mockAverages = {
        totalSurveys: 100,
        overallAverageRating: 4.5,
        assigneeAverageRating: 4.3,
        marketCenterAverageRating: 4.7,
      };

      mockSurveyRepository.getAllAverages.mockResolvedValue(mockAverages);

      const result = await getAllRatings({});

      expect(result).toEqual(mockAverages);
      expect(mockSurveyRepository.getAllAverages).toHaveBeenCalled();
    });

    it("should throw permission denied for non-admin users", async () => {
      vi.mocked(getUserContext).mockResolvedValue({
        userId: "user-123",
        role: "STAFF",
        marketCenterId: "mc-123",
      });

      await expect(getAllRatings({})).rejects.toThrow(
        "Market Center Id is required for non-admin users"
      );
    });
  });

  describe("getRatingsByAssignee", () => {
    it("should return ratings for a specific assignee", async () => {
      const mockAverages = {
        totalSurveys: 25,
        overallAverageRating: 4.2,
        assigneeAverageRating: 4.0,
        marketCenterAverageRating: 4.4,
      };

      mockSurveyRepository.hasCompletedSurveysForAssignee.mockResolvedValue(true);
      mockSurveyRepository.getAssigneeAverages.mockResolvedValue(mockAverages);

      const result = await getRatingsByAssignee({ assigneeId: "user-789" });

      expect(result).toEqual(mockAverages);
      expect(mockSurveyRepository.hasCompletedSurveysForAssignee).toHaveBeenCalledWith("user-789");
      expect(mockSurveyRepository.getAssigneeAverages).toHaveBeenCalledWith("user-789");
    });

    it("should throw not found when no surveys exist for assignee", async () => {
      mockSurveyRepository.hasCompletedSurveysForAssignee.mockResolvedValue(false);

      await expect(
        getRatingsByAssignee({ assigneeId: "user-no-surveys" })
      ).rejects.toThrow("Surveys not found for the given assignee Id");
    });

    it("should throw invalid argument when assigneeId is missing", async () => {
      await expect(getRatingsByAssignee({ assigneeId: "" })).rejects.toThrow(
        "Assignee Id is required"
      );
    });
  });

  describe("getByMarketCenter", () => {
    it("should return ratings for a market center (admin)", async () => {
      const mockAverages = {
        totalSurveys: 50,
        overallAverageRating: 4.6,
        assigneeAverageRating: 4.5,
        marketCenterAverageRating: 4.8,
      };

      mockSurveyRepository.hasCompletedSurveysForMarketCenter.mockResolvedValue(true);
      mockSurveyRepository.getMarketCenterAverages.mockResolvedValue(mockAverages);

      const result = await getByMarketCenter({ marketCenterId: "mc-456" });

      expect(result).toEqual(mockAverages);
      expect(mockSurveyRepository.hasCompletedSurveysForMarketCenter).toHaveBeenCalledWith("mc-456");
      expect(mockSurveyRepository.getMarketCenterAverages).toHaveBeenCalledWith("mc-456");
    });

    it("should use user's market center for non-admin users", async () => {
      vi.mocked(getUserContext).mockResolvedValue({
        userId: "user-123",
        role: "STAFF",
        marketCenterId: "user-mc-123",
      });

      const mockAverages = {
        totalSurveys: 30,
        overallAverageRating: 4.1,
        assigneeAverageRating: 4.0,
        marketCenterAverageRating: 4.2,
      };

      mockSurveyRepository.hasCompletedSurveysForMarketCenter.mockResolvedValue(true);
      mockSurveyRepository.getMarketCenterAverages.mockResolvedValue(mockAverages);

      const result = await getByMarketCenter({ marketCenterId: "ignored" });

      expect(mockSurveyRepository.getMarketCenterAverages).toHaveBeenCalledWith("user-mc-123");
    });

    it("should throw not found when no surveys exist for market center", async () => {
      mockSurveyRepository.hasCompletedSurveysForMarketCenter.mockResolvedValue(false);

      await expect(
        getByMarketCenter({ marketCenterId: "mc-no-surveys" })
      ).rejects.toThrow("Surveys not found for the given market center Id");
    });

    it("should throw permission denied when non-admin has no market center", async () => {
      vi.mocked(getUserContext).mockResolvedValue({
        userId: "user-123",
        role: "STAFF",
        marketCenterId: null,
      });

      await expect(
        getByMarketCenter({ marketCenterId: "mc-123" })
      ).rejects.toThrow("Market Center Id is required for non-admin users");
    });
  });
});
