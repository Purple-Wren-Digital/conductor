import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockUserRepository,
  mockTicketRepository,
  mockCommentRepository,
  mockNotificationTopic,
  mockCanBeNotifiedAboutComments,
} = vi.hoisted(() => ({
  mockUserRepository: {
    findById: vi.fn(),
    findByMarketCenterIdAndRole: vi.fn(),
  },
  mockTicketRepository: {
    findByIdWithRelations: vi.fn(),
  },
  mockCommentRepository: {
    findByTicketIdWithUsers: vi.fn(),
  },
  mockNotificationTopic: {
    publish: vi.fn(),
  },
  mockCanBeNotifiedAboutComments: vi.fn(),
}));

vi.mock("encore.dev/log", () => ({
  default: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

vi.mock("../ticket/db", () => ({
  userRepository: mockUserRepository,
  ticketRepository: mockTicketRepository,
  commentRepository: mockCommentRepository,
}));

vi.mock("./topic", () => ({
  notificationTopic: mockNotificationTopic,
}));

vi.mock("../auth/permissions", () => ({
  canBeNotifiedAboutComments: mockCanBeNotifiedAboutComments,
}));

import { resolveAndNotify } from "./activity-handlers";

// Fixtures
const makeUser = (id: string, name: string, role = "AGENT") => ({
  id,
  name,
  email: `${id}@example.com`,
  role,
  clerkId: `clerk_${id}`,
  marketCenterId: "mc-1",
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const creator = makeUser("creator-1", "Alice Creator");
const assignee = makeUser("assignee-1", "Bob Assignee", "STAFF");
const editor = makeUser("editor-1", "Eve Editor", "STAFF");
const staffLeader = makeUser("leader-1", "Charlie Leader", "STAFF_LEADER");

describe("Activity Handlers - resolveAndNotify", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockNotificationTopic.publish.mockResolvedValue(undefined);
  });

  // --- ticket.created ---

  describe("ticket.created", () => {
    it("should notify creator", async () => {
      mockUserRepository.findById.mockResolvedValue(creator);

      await resolveAndNotify({
        type: "ticket.created",
        ticketId: "t1",
        creatorId: creator.id,
        ticketTitle: "Test Ticket",
        createdAt: new Date().toISOString(),
      });

      expect(mockNotificationTopic.publish).toHaveBeenCalledWith(
        expect.objectContaining({ userId: creator.id, type: "Ticket Created" })
      );
    });

    it("should notify assignee with assignment notification", async () => {
      mockUserRepository.findById
        .mockResolvedValueOnce(creator)   // creator lookup
        .mockResolvedValueOnce(assignee); // assignee lookup

      await resolveAndNotify({
        type: "ticket.created",
        ticketId: "t1",
        creatorId: creator.id,
        assigneeId: assignee.id,
        ticketTitle: "Test Ticket",
        createdAt: new Date().toISOString(),
      });

      expect(mockNotificationTopic.publish).toHaveBeenCalledTimes(2);
      expect(mockNotificationTopic.publish).toHaveBeenCalledWith(
        expect.objectContaining({ userId: assignee.id, type: "Ticket Assignment" })
      );
    });

    it("should not notify assignee if same as creator", async () => {
      mockUserRepository.findById.mockResolvedValue(creator);

      await resolveAndNotify({
        type: "ticket.created",
        ticketId: "t1",
        creatorId: creator.id,
        assigneeId: creator.id,
        ticketTitle: "Test Ticket",
        createdAt: new Date().toISOString(),
      });

      // Only creator notification, no assignment
      expect(mockNotificationTopic.publish).toHaveBeenCalledTimes(1);
    });

    it("should no-op if creator not found", async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await resolveAndNotify({
        type: "ticket.created",
        ticketId: "t1",
        creatorId: "ghost",
        ticketTitle: "Test",
        createdAt: new Date().toISOString(),
      });

      expect(mockNotificationTopic.publish).not.toHaveBeenCalled();
    });
  });

  // --- ticket.assigned ---

  describe("ticket.assigned", () => {
    it("should notify old and new assignees", async () => {
      const oldAssignee = makeUser("old-a", "Old Assignee");
      const newAssignee = makeUser("new-a", "New Assignee");

      mockUserRepository.findById
        .mockResolvedValueOnce(editor)       // editor
        .mockResolvedValueOnce(oldAssignee)  // old assignee
        .mockResolvedValueOnce(newAssignee)  // new assignee name lookup
        .mockResolvedValueOnce(newAssignee)  // new assignee for notification
        .mockResolvedValueOnce(oldAssignee); // old assignee name lookup

      await resolveAndNotify({
        type: "ticket.assigned",
        ticketId: "t1",
        ticketTitle: "Test",
        editorId: editor.id,
        previousAssigneeId: oldAssignee.id,
        newAssigneeId: newAssignee.id,
      });

      expect(mockNotificationTopic.publish).toHaveBeenCalledTimes(2);
      expect(mockNotificationTopic.publish).toHaveBeenCalledWith(
        expect.objectContaining({ userId: oldAssignee.id })
      );
      expect(mockNotificationTopic.publish).toHaveBeenCalledWith(
        expect.objectContaining({ userId: newAssignee.id })
      );
    });

    it("should only notify new assignee if no previous", async () => {
      mockUserRepository.findById
        .mockResolvedValueOnce(editor)
        .mockResolvedValueOnce(assignee)
        .mockResolvedValueOnce(null); // no prev name lookup needed

      await resolveAndNotify({
        type: "ticket.assigned",
        ticketId: "t1",
        ticketTitle: "Test",
        editorId: editor.id,
        newAssigneeId: assignee.id,
      });

      expect(mockNotificationTopic.publish).toHaveBeenCalledTimes(1);
      expect(mockNotificationTopic.publish).toHaveBeenCalledWith(
        expect.objectContaining({ userId: assignee.id })
      );
    });
  });

  // --- ticket.updated ---

  describe("ticket.updated", () => {
    it("should notify creator and assignee, not editor", async () => {
      mockUserRepository.findById
        .mockResolvedValueOnce(editor)   // editor lookup
        .mockResolvedValueOnce(creator)  // creator
        .mockResolvedValueOnce(assignee); // assignee

      await resolveAndNotify({
        type: "ticket.updated",
        ticketId: "t1",
        ticketTitle: "Test",
        editorId: editor.id,
        changedDetails: [{ label: "urgency", originalValue: "LOW", newValue: "HIGH" }],
        creatorId: creator.id,
        assigneeId: assignee.id,
      });

      expect(mockNotificationTopic.publish).toHaveBeenCalledTimes(2);
      expect(mockNotificationTopic.publish).toHaveBeenCalledWith(
        expect.objectContaining({ userId: creator.id })
      );
      expect(mockNotificationTopic.publish).toHaveBeenCalledWith(
        expect.objectContaining({ userId: assignee.id })
      );
    });

    it("should notify editor if they are the only participant", async () => {
      mockUserRepository.findById.mockResolvedValueOnce(editor).mockResolvedValueOnce(editor);

      await resolveAndNotify({
        type: "ticket.updated",
        ticketId: "t1",
        ticketTitle: "Test",
        editorId: editor.id,
        changedDetails: [{ label: "status", originalValue: "OPEN", newValue: "IN_PROGRESS" }],
        creatorId: editor.id,
        assigneeId: editor.id,
      });

      expect(mockNotificationTopic.publish).toHaveBeenCalledTimes(1);
      expect(mockNotificationTopic.publish).toHaveBeenCalledWith(
        expect.objectContaining({ userId: editor.id })
      );
    });
  });

  // --- ticket.closed ---

  describe("ticket.closed", () => {
    it("should send survey notification to agent creator", async () => {
      mockUserRepository.findById.mockResolvedValue(creator);

      await resolveAndNotify({
        type: "ticket.closed",
        ticketId: "t1",
        ticketTitle: "Test",
        creatorId: creator.id,
        creatorRole: "AGENT",
        surveyId: "survey-1",
      });

      expect(mockNotificationTopic.publish).toHaveBeenCalledWith(
        expect.objectContaining({ userId: creator.id, type: "Ticket Survey" })
      );
    });

    it("should send closed notification to non-agent creator", async () => {
      const staffCreator = makeUser("staff-c", "Staff Creator", "STAFF");
      mockUserRepository.findById.mockResolvedValue(staffCreator);

      await resolveAndNotify({
        type: "ticket.closed",
        ticketId: "t1",
        ticketTitle: "Test",
        creatorId: staffCreator.id,
        creatorRole: "STAFF",
        surveyId: "survey-1",
      });

      expect(mockNotificationTopic.publish).toHaveBeenCalledWith(
        expect.objectContaining({ userId: staffCreator.id, type: "Ticket Updated" })
      );
    });

    it("should notify both creator and assignee", async () => {
      mockUserRepository.findById
        .mockResolvedValueOnce(creator)
        .mockResolvedValueOnce(assignee);

      await resolveAndNotify({
        type: "ticket.closed",
        ticketId: "t1",
        ticketTitle: "Test",
        creatorId: creator.id,
        assigneeId: assignee.id,
      });

      expect(mockNotificationTopic.publish).toHaveBeenCalledTimes(2);
    });
  });

  // --- ticket.reopened ---

  describe("ticket.reopened", () => {
    it("should notify creator and assignee but not editor", async () => {
      mockUserRepository.findById
        .mockResolvedValueOnce(creator)
        .mockResolvedValueOnce(assignee);

      await resolveAndNotify({
        type: "ticket.reopened",
        ticketId: "t1",
        ticketTitle: "Test",
        creatorId: creator.id,
        assigneeId: assignee.id,
        editorId: editor.id,
      });

      expect(mockNotificationTopic.publish).toHaveBeenCalledTimes(2);
    });

    it("should notify editor if they are the only participant", async () => {
      mockUserRepository.findById.mockResolvedValueOnce(editor);

      await resolveAndNotify({
        type: "ticket.reopened",
        ticketId: "t1",
        ticketTitle: "Test",
        creatorId: editor.id,
        editorId: editor.id,
      });

      expect(mockNotificationTopic.publish).toHaveBeenCalledTimes(1);
      expect(mockNotificationTopic.publish).toHaveBeenCalledWith(
        expect.objectContaining({ userId: editor.id })
      );
    });
  });

  // --- comment.created ---

  describe("comment.created", () => {
    it("should notify assignee and creator with permission checks", async () => {
      const ticket = {
        id: "t1",
        assignee: { id: assignee.id, role: "STAFF" },
        creator: { id: creator.id, role: "AGENT" },
      };

      mockTicketRepository.findByIdWithRelations
        .mockResolvedValueOnce(ticket) // assignee check
        .mockResolvedValueOnce(ticket); // creator check
      mockCanBeNotifiedAboutComments.mockResolvedValue(true);
      mockCommentRepository.findByTicketIdWithUsers.mockResolvedValue([]);
      mockUserRepository.findById
        .mockResolvedValueOnce(assignee)
        .mockResolvedValueOnce(creator);

      await resolveAndNotify({
        type: "comment.created",
        ticketId: "t1",
        ticketTitle: "Test",
        commenterId: "commenter-x",
        commenterName: "Commenter X",
        content: "Hello",
        isInternal: false,
        assigneeId: assignee.id,
        creatorId: creator.id,
      });

      expect(mockNotificationTopic.publish).toHaveBeenCalledTimes(2);
      expect(mockCanBeNotifiedAboutComments).toHaveBeenCalledTimes(2);
    });

    it("should skip assignee if canBeNotified returns false", async () => {
      const ticket = {
        id: "t1",
        assignee: { id: assignee.id, role: "AGENT" },
        creator: { id: creator.id, role: "STAFF" },
      };

      mockTicketRepository.findByIdWithRelations.mockResolvedValue(ticket);
      mockCanBeNotifiedAboutComments
        .mockResolvedValueOnce(false)  // assignee denied
        .mockResolvedValueOnce(true);  // creator allowed
      mockCommentRepository.findByTicketIdWithUsers.mockResolvedValue([]);
      mockUserRepository.findById.mockResolvedValueOnce(creator);

      await resolveAndNotify({
        type: "comment.created",
        ticketId: "t1",
        ticketTitle: "Test",
        commenterId: "commenter-x",
        commenterName: "X",
        content: "Hello",
        isInternal: true,
        assigneeId: assignee.id,
        creatorId: creator.id,
      });

      expect(mockNotificationTopic.publish).toHaveBeenCalledTimes(1);
      expect(mockNotificationTopic.publish).toHaveBeenCalledWith(
        expect.objectContaining({ userId: creator.id })
      );
    });

    it("should include previous commenters", async () => {
      const prevCommenter = makeUser("prev-c", "Previous Commenter");
      const ticket = {
        id: "t1",
        assignee: null,
        creator: null,
      };

      mockTicketRepository.findByIdWithRelations.mockResolvedValue(ticket);
      mockCanBeNotifiedAboutComments.mockResolvedValue(true);
      mockCommentRepository.findByTicketIdWithUsers.mockResolvedValue([
        { user: { id: prevCommenter.id, role: "AGENT" } },
      ]);
      mockUserRepository.findById.mockResolvedValueOnce(prevCommenter);

      await resolveAndNotify({
        type: "comment.created",
        ticketId: "t1",
        ticketTitle: "Test",
        commenterId: "new-commenter",
        commenterName: "New",
        content: "Reply",
        isInternal: false,
        creatorId: "someone-else",
      });

      expect(mockNotificationTopic.publish).toHaveBeenCalledWith(
        expect.objectContaining({ userId: prevCommenter.id })
      );
    });
  });

  // --- survey.completed ---

  describe("survey.completed", () => {
    it("should notify assignee and staff leaders", async () => {
      mockUserRepository.findById.mockResolvedValue(assignee);
      mockUserRepository.findByMarketCenterIdAndRole.mockResolvedValue([staffLeader]);

      await resolveAndNotify({
        type: "survey.completed",
        ticketId: "t1",
        ticketTitle: "Test",
        assigneeId: assignee.id,
        marketCenterId: "mc-1",
        staffName: "Staff Name",
      });

      expect(mockNotificationTopic.publish).toHaveBeenCalledTimes(2);
      expect(mockNotificationTopic.publish).toHaveBeenCalledWith(
        expect.objectContaining({ userId: assignee.id })
      );
      expect(mockNotificationTopic.publish).toHaveBeenCalledWith(
        expect.objectContaining({ userId: staffLeader.id })
      );
    });

    it("should not double-notify staff leader who is also assignee", async () => {
      mockUserRepository.findById.mockResolvedValue(staffLeader);
      mockUserRepository.findByMarketCenterIdAndRole.mockResolvedValue([staffLeader]);

      await resolveAndNotify({
        type: "survey.completed",
        ticketId: "t1",
        ticketTitle: "Test",
        assigneeId: staffLeader.id,
        marketCenterId: "mc-1",
        staffName: "Staff",
      });

      expect(mockNotificationTopic.publish).toHaveBeenCalledTimes(1);
    });
  });

  // --- marketCenter.usersAdded ---

  describe("marketCenter.usersAdded", () => {
    it("should notify each added user", async () => {
      const user1 = makeUser("u1", "User 1");
      const user2 = makeUser("u2", "User 2");

      mockUserRepository.findById
        .mockResolvedValueOnce(user1)
        .mockResolvedValueOnce(user2);

      await resolveAndNotify({
        type: "marketCenter.usersAdded",
        marketCenterId: "mc-1",
        marketCenterName: "Test MC",
        userIds: [user1.id, user2.id],
        editorId: editor.id,
        editorName: editor.name!,
        editorEmail: editor.email,
      });

      expect(mockNotificationTopic.publish).toHaveBeenCalledTimes(2);
    });
  });

  // --- category.assignmentChanged ---

  describe("category.assignmentChanged", () => {
    it("should notify old and new assignees", async () => {
      const oldUser = makeUser("old-u", "Old Default");
      const newUser = makeUser("new-u", "New Default");

      mockUserRepository.findById
        .mockResolvedValueOnce(oldUser)
        .mockResolvedValueOnce(newUser);

      await resolveAndNotify({
        type: "category.assignmentChanged",
        categoryId: "cat-1",
        categoryName: "General",
        categoryDescription: "General inquiries",
        marketCenterId: "mc-1",
        marketCenterName: "Test MC",
        oldAssigneeId: oldUser.id,
        newAssigneeId: newUser.id,
        editorId: editor.id,
        editorName: editor.name!,
        editorEmail: editor.email,
      });

      expect(mockNotificationTopic.publish).toHaveBeenCalledTimes(2);
      expect(mockNotificationTopic.publish).toHaveBeenCalledWith(
        expect.objectContaining({ userId: oldUser.id, type: "Category Assignment" })
      );
      expect(mockNotificationTopic.publish).toHaveBeenCalledWith(
        expect.objectContaining({ userId: newUser.id, type: "Category Assignment" })
      );
    });
  });

  // --- Error handling ---

  describe("error handling", () => {
    it("should re-throw errors for Pub/Sub retry", async () => {
      mockUserRepository.findById.mockRejectedValue(new Error("DB down"));

      await expect(
        resolveAndNotify({
          type: "ticket.created",
          ticketId: "t1",
          creatorId: "c1",
          ticketTitle: "Test",
          createdAt: new Date().toISOString(),
        })
      ).rejects.toThrow("DB down");
    });
  });
});
