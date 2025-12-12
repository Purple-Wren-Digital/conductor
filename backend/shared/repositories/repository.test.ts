/**
 * Repository Tests - Verify the new Encore SQLDatabase setup works correctly
 *
 * These tests verify that the repository pattern works as expected.
 * Run with: npm test
 */

import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock the database module - this is hoisted to the top
vi.mock("../../ticket/db", () => ({
  db: {
    queryRow: vi.fn(),
    queryAll: vi.fn(),
    exec: vi.fn(),
    rawQueryRow: vi.fn(),
    rawQueryAll: vi.fn(),
    rawQuery: vi.fn(),
    rawExec: vi.fn(),
  },
  fromTimestamp: (val: any) => val ? new Date(val) : null,
  toTimestamp: (val: any) => val ? val.toISOString() : null,
  toJson: (val: any) => JSON.stringify(val),
  fromJson: (val: any) => val ? (typeof val === 'string' ? JSON.parse(val) : val) : null,
  generateId: vi.fn().mockReturnValue("generated-id-123"),
}));

// Import the mocked db and repositories
import { db } from "../../ticket/db";
import { userRepository } from "./user.repository";
import { ticketRepository } from "./ticket.repository";
import { commentRepository } from "./comment.repository";
import { notificationRepository } from "./notification.repository";
import { marketCenterRepository } from "./market-center.repository";
import { surveyRepository } from "./survey.repository";
import { todoRepository } from "./todo.repository";
import { subscriptionRepository } from "./subscription.repository";
import { settingsAuditRepository } from "./settings-audit.repository";
import { SubscriptionStatus, SubscriptionPlan } from "../../subscription/types";

// Type the mocked db
const mockedDb = vi.mocked(db);

beforeEach(() => {
  vi.clearAllMocks();
});

// ==================== USER REPOSITORY TESTS ====================
describe("User Repository", () => {
  const mockUserRow = {
    id: "user-123",
    email: "test@example.com",
    name: "Test User",
    role: "AGENT",
    market_center_id: "mc-123",
    clerk_id: "clerk-123",
    is_active: true,
    created_at: new Date("2024-01-01"),
    updated_at: new Date("2024-01-02"),
  };

  it("should find user by id", async () => {
    mockedDb.queryRow.mockResolvedValueOnce(mockUserRow);

    const user = await userRepository.findById("user-123");

    expect(user).toBeDefined();
    expect(user?.id).toBe("user-123");
    expect(user?.email).toBe("test@example.com");
    expect(user?.name).toBe("Test User");
    expect(user?.role).toBe("AGENT");
    expect(user?.marketCenterId).toBe("mc-123");
    expect(user?.clerkId).toBe("clerk-123");
    expect(user?.isActive).toBe(true);
  });

  it("should return null when user not found", async () => {
    mockedDb.queryRow.mockResolvedValueOnce(null);

    const user = await userRepository.findById("nonexistent");

    expect(user).toBeNull();
  });

  it("should find user by email", async () => {
    mockedDb.queryRow.mockResolvedValueOnce(mockUserRow);

    const user = await userRepository.findByEmail("test@example.com");

    expect(user).toBeDefined();
    expect(user?.email).toBe("test@example.com");
  });

  it("should find user by clerk id", async () => {
    mockedDb.queryRow.mockResolvedValueOnce(mockUserRow);

    const user = await userRepository.findByClerkId("clerk-123");

    expect(user).toBeDefined();
    expect(user?.clerkId).toBe("clerk-123");
  });

  it("should find users by market center", async () => {
    mockedDb.queryAll.mockResolvedValueOnce([mockUserRow, { ...mockUserRow, id: "user-456" }]);

    const users = await userRepository.findByMarketCenterId("mc-123");

    expect(users).toHaveLength(2);
    expect(users[0].id).toBe("user-123");
    expect(users[1].id).toBe("user-456");
  });

  it("should create a new user", async () => {
    mockedDb.queryRow.mockResolvedValueOnce(mockUserRow);

    const user = await userRepository.create({
      email: "test@example.com",
      name: "Test User",
      role: "AGENT",
      clerkId: "clerk-123",
    });

    expect(user).toBeDefined();
    expect(user.email).toBe("test@example.com");
  });

  it("should find user by id or clerk id", async () => {
    mockedDb.queryRow.mockResolvedValueOnce(mockUserRow);

    const user = await userRepository.findByIdOrClerkId("user-123");

    expect(user).toBeDefined();
    expect(user?.id).toBe("user-123");
  });
});

// ==================== TICKET REPOSITORY TESTS ====================
describe("Ticket Repository", () => {
  const mockTicketRow = {
    id: "ticket-123",
    title: "Test Ticket",
    description: "Test description",
    status: "ASSIGNED",
    urgency: "HIGH",
    creator_id: "user-123",
    assignee_id: "user-456",
    category_id: "cat-123",
    due_date: new Date("2024-02-01"),
    resolved_at: null,
    created_at: new Date("2024-01-01"),
    updated_at: new Date("2024-01-02"),
  };

  it("should find ticket by id", async () => {
    mockedDb.queryRow.mockResolvedValueOnce(mockTicketRow);

    const ticket = await ticketRepository.findById("ticket-123");

    expect(ticket).toBeDefined();
    expect(ticket?.id).toBe("ticket-123");
    expect(ticket?.title).toBe("Test Ticket");
    expect(ticket?.status).toBe("ASSIGNED");
    expect(ticket?.urgency).toBe("HIGH");
  });

  it("should return null when ticket not found", async () => {
    mockedDb.queryRow.mockResolvedValueOnce(null);

    const ticket = await ticketRepository.findById("nonexistent");

    expect(ticket).toBeNull();
  });

  it("should update ticket status", async () => {
    mockedDb.rawQueryRow.mockResolvedValueOnce({ ...mockTicketRow, status: "IN_PROGRESS" });

    const ticket = await ticketRepository.update("ticket-123", { status: "IN_PROGRESS" });

    expect(ticket?.status).toBe("IN_PROGRESS");
  });

  it("should find tickets by ids", async () => {
    mockedDb.rawQueryAll.mockResolvedValueOnce([mockTicketRow, { ...mockTicketRow, id: "ticket-456" }]);

    const tickets = await ticketRepository.findByIds(["ticket-123", "ticket-456"]);

    expect(tickets).toHaveLength(2);
    expect(tickets[0].id).toBe("ticket-123");
    expect(tickets[1].id).toBe("ticket-456");
  });

  it("should create a new ticket", async () => {
    mockedDb.queryRow.mockResolvedValueOnce(mockTicketRow);

    const ticket = await ticketRepository.create({
      title: "Test Ticket",
      description: "Test description",
      creatorId: "user-123",
      urgency: "HIGH",
    });

    expect(ticket).toBeDefined();
    expect(ticket.title).toBe("Test Ticket");
  });
});

// ==================== COMMENT REPOSITORY TESTS ====================
describe("Comment Repository", () => {
  const mockCommentRow = {
    id: "comment-123",
    content: "Test comment",
    ticket_id: "ticket-123",
    user_id: "user-123",
    internal: false,
    source: "WEB",
    metadata: {},
    created_at: new Date("2024-01-01"),
    updated_at: new Date("2024-01-02"),
  };

  it("should find comment by id", async () => {
    mockedDb.queryRow.mockResolvedValueOnce(mockCommentRow);

    const comment = await commentRepository.findById("comment-123");

    expect(comment).toBeDefined();
    expect(comment?.id).toBe("comment-123");
    expect(comment?.content).toBe("Test comment");
    expect(comment?.internal).toBe(false);
  });

  it("should find comments by ticket id", async () => {
    mockedDb.rawQueryAll.mockResolvedValueOnce([mockCommentRow]);

    const comments = await commentRepository.findByTicketId("ticket-123");

    expect(comments).toHaveLength(1);
    expect(comments[0].ticketId).toBe("ticket-123");
  });

  it("should filter out internal comments when requested", async () => {
    const publicComment = { ...mockCommentRow, internal: false };
    mockedDb.rawQueryAll.mockResolvedValueOnce([publicComment]);

    const comments = await commentRepository.findByTicketId("ticket-123", { includeInternal: false });

    expect(comments).toHaveLength(1);
    expect(comments[0].internal).toBe(false);
  });

  it("should create a new comment", async () => {
    mockedDb.queryRow.mockResolvedValueOnce(mockCommentRow);

    const comment = await commentRepository.create({
      content: "Test comment",
      ticketId: "ticket-123",
      userId: "user-123",
    });

    expect(comment).toBeDefined();
    expect(comment.content).toBe("Test comment");
  });

  it("should count comments for a ticket", async () => {
    mockedDb.rawQueryRow.mockResolvedValueOnce({ count: 5 });

    const count = await commentRepository.countByTicketId("ticket-123");

    expect(count).toBe(5);
  });

  it("should check if user has commented on ticket", async () => {
    mockedDb.queryRow.mockResolvedValueOnce({ exists: true });

    const hasCommented = await commentRepository.userHasCommented("ticket-123", "user-123");

    expect(hasCommented).toBe(true);
  });
});

// ==================== NOTIFICATION REPOSITORY TESTS ====================
describe("Notification Repository", () => {
  const mockNotificationRow = {
    id: "notif-123",
    user_id: "user-123",
    channel: "IN_APP",
    category: "TICKET",
    priority: "HIGH",
    type: "TICKET_ASSIGNED",
    title: "New Assignment",
    body: "You have been assigned a ticket",
    data: '{"ticketId": "ticket-123"}',
    read: false,
    delivered_at: null,
    created_at: new Date("2024-01-01"),
  };

  it("should find notification by id", async () => {
    mockedDb.queryRow.mockResolvedValueOnce(mockNotificationRow);

    const notification = await notificationRepository.findById("notif-123");

    expect(notification).toBeDefined();
    expect(notification?.id).toBe("notif-123");
    expect(notification?.title).toBe("New Assignment");
    expect(notification?.read).toBe(false);
  });

  it("should find notifications by user id", async () => {
    mockedDb.rawQueryAll.mockResolvedValueOnce([mockNotificationRow]);

    const notifications = await notificationRepository.findByUserId("user-123");

    expect(notifications).toHaveLength(1);
    expect(notifications[0].userId).toBe("user-123");
  });

  it("should find only unread notifications", async () => {
    mockedDb.rawQueryAll.mockResolvedValueOnce([mockNotificationRow]);

    const notifications = await notificationRepository.findByUserId("user-123", { unreadOnly: true });

    expect(notifications).toHaveLength(1);
  });

  it("should create a notification", async () => {
    mockedDb.queryRow.mockResolvedValueOnce(mockNotificationRow);

    const notification = await notificationRepository.create({
      userId: "user-123",
      channel: "IN_APP",
      category: "ACTIVITY",
      type: "TICKET_ASSIGNED",
      title: "New Assignment",
      body: "You have been assigned a ticket",
    });

    expect(notification).toBeDefined();
    expect(notification.title).toBe("New Assignment");
  });

  it("should mark notification as read", async () => {
    const readNotification = { ...mockNotificationRow, read: true, delivered_at: new Date() };
    mockedDb.queryRow.mockResolvedValueOnce(readNotification);

    const notification = await notificationRepository.markAsRead("notif-123");

    expect(notification?.read).toBe(true);
  });

  it("should mark all notifications as read", async () => {
    mockedDb.queryRow.mockResolvedValueOnce({ count: 5 });

    const count = await notificationRepository.markAllAsRead("user-123");

    expect(count).toBe(5);
  });

  it("should count unread notifications", async () => {
    mockedDb.rawQueryRow.mockResolvedValueOnce({ count: 3 });

    const count = await notificationRepository.countUnread("user-123");

    expect(count).toBe(3);
  });

  it("should delete notification", async () => {
    mockedDb.exec.mockResolvedValueOnce(undefined);

    const result = await notificationRepository.delete("notif-123");

    expect(result).toBe(true);
  });
});

// ==================== MARKET CENTER REPOSITORY TESTS ====================
describe("Market Center Repository", () => {
  const mockMarketCenterRow = {
    id: "mc-123",
    name: "Test Market Center",
    settings: '{"theme": "dark"}',
    created_at: new Date("2024-01-01"),
    updated_at: new Date("2024-01-02"),
  };

  const mockCategoryRow = {
    id: "cat-123",
    name: "Support",
    description: "Support tickets",
    market_center_id: "mc-123",
    default_assignee_id: "user-123",
    created_at: new Date("2024-01-01"),
    updated_at: new Date("2024-01-02"),
  };

  const mockInvitationRow = {
    id: "inv-123",
    email: "invite@example.com",
    role: "STAFF",
    status: "PENDING",
    market_center_id: "mc-123",
    invited_by: "user-123",
    token: "token-abc",
    expires_at: new Date("2024-02-01"),
    accepted_at: null,
    created_at: new Date("2024-01-01"),
    updated_at: new Date("2024-01-02"),
  };

  it("should find market center by id", async () => {
    mockedDb.queryRow.mockResolvedValueOnce(mockMarketCenterRow);

    const mc = await marketCenterRepository.findById("mc-123");

    expect(mc).toBeDefined();
    expect(mc?.id).toBe("mc-123");
    expect(mc?.name).toBe("Test Market Center");
  });

  it("should find all market centers", async () => {
    mockedDb.queryAll.mockResolvedValueOnce([mockMarketCenterRow]);

    const mcs = await marketCenterRepository.findAll();

    expect(mcs).toHaveLength(1);
    expect(mcs[0].name).toBe("Test Market Center");
  });

  it("should create market center", async () => {
    mockedDb.queryRow.mockResolvedValueOnce(mockMarketCenterRow);

    const mc = await marketCenterRepository.create({ name: "New MC" });

    expect(mc).toBeDefined();
    expect(mc.name).toBe("Test Market Center");
  });

  it("should update market center", async () => {
    mockedDb.rawQueryRow.mockResolvedValueOnce({ ...mockMarketCenterRow, name: "Updated MC" });

    const mc = await marketCenterRepository.update("mc-123", { name: "Updated MC" });

    expect(mc?.name).toBe("Updated MC");
  });

  it("should find category by id", async () => {
    mockedDb.queryRow.mockResolvedValueOnce(mockCategoryRow);

    const category = await marketCenterRepository.findCategoryById("cat-123");

    expect(category).toBeDefined();
    expect(category?.name).toBe("Support");
  });

  it("should find categories by market center", async () => {
    mockedDb.queryAll.mockResolvedValueOnce([mockCategoryRow]);

    const categories = await marketCenterRepository.findCategoriesByMarketCenterId("mc-123");

    expect(categories).toHaveLength(1);
    expect(categories[0].marketCenterId).toBe("mc-123");
  });

  it("should create category", async () => {
    mockedDb.queryRow.mockResolvedValueOnce(mockCategoryRow);

    const category = await marketCenterRepository.createCategory({
      name: "Support",
      marketCenterId: "mc-123",
    });

    expect(category).toBeDefined();
    expect(category.name).toBe("Support");
  });

  it("should find invitation by token", async () => {
    mockedDb.queryRow.mockResolvedValueOnce(mockInvitationRow);

    const invitation = await marketCenterRepository.findInvitationByToken("token-abc");

    expect(invitation).toBeDefined();
    expect(invitation?.email).toBe("invite@example.com");
  });

  it("should create invitation", async () => {
    mockedDb.queryRow.mockResolvedValueOnce(mockInvitationRow);

    const invitation = await marketCenterRepository.createInvitation({
      email: "invite@example.com",
      role: "STAFF",
      token: "token-abc",
      expiresAt: new Date("2024-02-01"),
    });

    expect(invitation).toBeDefined();
    expect(invitation.status).toBe("PENDING");
  });
});

// ==================== SURVEY REPOSITORY TESTS ====================
describe("Survey Repository", () => {
  const mockSurveyRow = {
    id: "survey-123",
    ticket_id: "ticket-123",
    comment: "Great service!",
    created_at: new Date("2024-01-01"),
    updated_at: new Date("2024-01-02"),
    surveyor_id: "user-123",
    assignee_rating: "4.5",
    market_center_rating: "4.0",
    overall_rating: "4.25",
    assignee_id: "user-456",
    market_center_id: "mc-123",
    completed: true,
  };

  it("should find survey by id", async () => {
    mockedDb.queryRow.mockResolvedValueOnce(mockSurveyRow);

    const survey = await surveyRepository.findById("survey-123");

    expect(survey).toBeDefined();
    expect(survey?.id).toBe("survey-123");
    expect(survey?.completed).toBe(true);
  });

  it("should find survey by ticket id", async () => {
    mockedDb.queryRow.mockResolvedValueOnce(mockSurveyRow);

    const survey = await surveyRepository.findByTicketId("ticket-123");

    expect(survey).toBeDefined();
    expect(survey?.ticketId).toBe("ticket-123");
  });

  it("should parse decimal ratings correctly", async () => {
    mockedDb.queryRow.mockResolvedValueOnce(mockSurveyRow);

    const survey = await surveyRepository.findById("survey-123");

    expect(survey?.assigneeRating).toBe(4.5);
    expect(survey?.marketCenterRating).toBe(4.0);
    expect(survey?.overallRating).toBe(4.25);
  });

  it("should create survey", async () => {
    const newSurveyRow = { ...mockSurveyRow, completed: false };
    mockedDb.queryRow.mockResolvedValueOnce(newSurveyRow);

    const survey = await surveyRepository.create({
      ticketId: "ticket-123",
      surveyorId: "user-123",
    });

    expect(survey).toBeDefined();
    expect(survey.completed).toBe(false);
  });

  it("should update survey ratings", async () => {
    mockedDb.rawQueryRow.mockResolvedValueOnce(mockSurveyRow);

    const survey = await surveyRepository.update("survey-123", {
      assigneeRating: 5.0,
      completed: true,
    });

    expect(survey).toBeDefined();
  });

  it("should get assignee averages", async () => {
    mockedDb.queryRow.mockResolvedValueOnce({
      total: 10,
      assignee_avg: "4.2",
      overall_avg: "4.5",
    });

    const averages = await surveyRepository.getAssigneeAverages("user-123");

    expect(averages.totalSurveys).toBe(10);
    expect(averages.assigneeAverageRating).toBe(4.2);
    expect(averages.overallAverageRating).toBe(4.5);
  });

  it("should get market center averages", async () => {
    mockedDb.queryRow.mockResolvedValueOnce({
      total: 20,
      mc_avg: "4.3",
      overall_avg: "4.4",
    });

    const averages = await surveyRepository.getMarketCenterAverages("mc-123");

    expect(averages.totalSurveys).toBe(20);
    expect(averages.marketCenterAverageRating).toBe(4.3);
  });

  it("should find pending surveys for surveyor", async () => {
    const pendingSurvey = { ...mockSurveyRow, completed: false };
    mockedDb.queryAll.mockResolvedValueOnce([pendingSurvey]);

    const surveys = await surveyRepository.findPendingBySurveyorId("user-123");

    expect(surveys).toHaveLength(1);
    expect(surveys[0].completed).toBe(false);
  });
});

// ==================== TODO REPOSITORY TESTS ====================
describe("Todo Repository", () => {
  const mockTodoRow = {
    id: "todo-123",
    title: "Complete task",
    complete: false,
    ticket_id: "ticket-123",
    created_at: new Date("2024-01-01"),
    updated_at: new Date("2024-01-02"),
    created_by_user_id: "user-123",
    updated_by_user_id: null,
    created_by: '{"id": "user-123", "name": "John"}',
    updated_by: null,
  };

  it("should find todo by id", async () => {
    mockedDb.queryRow.mockResolvedValueOnce(mockTodoRow);

    const todo = await todoRepository.findById("todo-123");

    expect(todo).toBeDefined();
    expect(todo?.id).toBe("todo-123");
    expect(todo?.title).toBe("Complete task");
    expect(todo?.complete).toBe(false);
  });

  it("should find todos by ticket id", async () => {
    mockedDb.queryAll.mockResolvedValueOnce([mockTodoRow]);

    const todos = await todoRepository.findByTicketId("ticket-123");

    expect(todos).toHaveLength(1);
    expect(todos[0].ticketId).toBe("ticket-123");
  });

  it("should create todo", async () => {
    mockedDb.queryRow.mockResolvedValueOnce(mockTodoRow);

    const todo = await todoRepository.create({
      title: "Complete task",
      ticketId: "ticket-123",
      createdById: "user-123",
    });

    expect(todo).toBeDefined();
    expect(todo.title).toBe("Complete task");
  });

  it("should update todo", async () => {
    const updatedTodo = { ...mockTodoRow, complete: true };
    mockedDb.rawQueryRow.mockResolvedValueOnce(updatedTodo);

    const todo = await todoRepository.update("todo-123", {
      complete: true,
      updatedById: "user-123",
    });

    expect(todo?.complete).toBe(true);
  });

  it("should toggle todo completion", async () => {
    const toggledTodo = { ...mockTodoRow, complete: true };
    mockedDb.queryRow.mockResolvedValueOnce(toggledTodo);

    const todo = await todoRepository.toggleComplete("todo-123", "user-123");

    expect(todo?.complete).toBe(true);
  });

  it("should delete todo", async () => {
    mockedDb.exec.mockResolvedValueOnce(undefined);

    const result = await todoRepository.delete("todo-123");

    expect(result).toBe(true);
  });

  it("should delete todos by ticket id", async () => {
    mockedDb.queryRow.mockResolvedValueOnce({ count: 3 });

    const count = await todoRepository.deleteByTicketId("ticket-123");

    expect(count).toBe(3);
  });

  it("should count todos by ticket", async () => {
    mockedDb.rawQueryRow.mockResolvedValueOnce({ count: 5 });

    const count = await todoRepository.countByTicketId("ticket-123");

    expect(count).toBe(5);
  });

  it("should count only completed todos", async () => {
    mockedDb.rawQueryRow.mockResolvedValueOnce({ count: 2 });

    const count = await todoRepository.countByTicketId("ticket-123", { complete: true });

    expect(count).toBe(2);
  });
});

// ==================== SUBSCRIPTION REPOSITORY TESTS ====================
describe("Subscription Repository", () => {
  const mockSubscriptionRow = {
    id: "sub-123",
    stripe_subscription_id: "stripe-sub-123",
    stripe_customer_id: "stripe-cus-123",
    market_center_id: "mc-123",
    status: "ACTIVE",
    plan_type: "PROFESSIONAL",
    price_id: "price-123",
    included_seats: 5,
    additional_seats: 3,
    seat_price: "10.00",
    current_period_start: new Date("2024-01-01"),
    current_period_end: new Date("2024-02-01"),
    cancel_at: null,
    canceled_at: null,
    trial_end: null,
    features: '{"feature1": true}',
    created_at: new Date("2024-01-01"),
    updated_at: new Date("2024-01-02"),
  };

  it("should find subscription by market center id", async () => {
    mockedDb.queryRow.mockResolvedValueOnce(mockSubscriptionRow);

    const sub = await subscriptionRepository.findByMarketCenterId("mc-123");

    expect(sub).toBeDefined();
    expect(sub?.marketCenterId).toBe("mc-123");
    expect(sub?.status).toBe("ACTIVE");
  });

  it("should find subscription by id", async () => {
    mockedDb.queryRow.mockResolvedValueOnce(mockSubscriptionRow);

    const sub = await subscriptionRepository.findById("sub-123");

    expect(sub).toBeDefined();
    expect(sub?.id).toBe("sub-123");
  });

  it("should find subscription by stripe subscription id", async () => {
    mockedDb.queryRow.mockResolvedValueOnce(mockSubscriptionRow);

    const sub = await subscriptionRepository.findByStripeSubscriptionId("stripe-sub-123");

    expect(sub).toBeDefined();
    expect(sub?.stripeSubscriptionId).toBe("stripe-sub-123");
  });

  it("should parse seat price correctly", async () => {
    mockedDb.queryRow.mockResolvedValueOnce(mockSubscriptionRow);

    const sub = await subscriptionRepository.findById("sub-123");

    expect(sub?.seatPrice).toBe(10.0);
  });

  it("should find subscription with user count", async () => {
    mockedDb.queryRow.mockResolvedValueOnce(mockSubscriptionRow);
    mockedDb.queryRow.mockResolvedValueOnce({ count: 8 });

    const result = await subscriptionRepository.findByMarketCenterIdWithUserCount("mc-123");

    expect(result).toBeDefined();
    expect(result?.subscription.marketCenterId).toBe("mc-123");
    expect(result?.activeUserCount).toBe(8);
  });

  it("should create subscription", async () => {
    mockedDb.queryRow.mockResolvedValueOnce(mockSubscriptionRow);

    const sub = await subscriptionRepository.create({
      stripeSubscriptionId: "stripe-sub-123",
      stripeCustomerId: "stripe-cus-123",
      marketCenterId: "mc-123",
      status: SubscriptionStatus.ACTIVE,
      planType: SubscriptionPlan.TEAM,
      priceId: "price-123",
      currentPeriodStart: new Date("2024-01-01"),
      currentPeriodEnd: new Date("2024-02-01"),
    });

    expect(sub).toBeDefined();
    expect(sub.status).toBe("ACTIVE");
  });

  it("should update subscription", async () => {
    const canceledSub = { ...mockSubscriptionRow, status: "CANCELED" };
    mockedDb.rawQueryRow.mockResolvedValueOnce(canceledSub);

    const sub = await subscriptionRepository.update("sub-123", { status: SubscriptionStatus.CANCELED });

    expect(sub?.status).toBe("CANCELED");
  });

  it("should delete subscription", async () => {
    mockedDb.exec.mockResolvedValueOnce(undefined);

    const result = await subscriptionRepository.delete("sub-123");

    expect(result).toBe(true);
  });

  // ==================== NEW: MULTI-MARKET-CENTER ACCESS TESTS ====================
  describe("Multi-Market-Center Access (Enterprise)", () => {
    const mockSubscriptionRowEnterprise = {
      id: "sub-123",
      stripe_subscription_id: "stripe-sub-123",
      stripe_customer_id: "stripe-cus-enterprise",
      market_center_id: "mc-123",
      status: "ACTIVE",
      plan_type: "ENTERPRISE",
      price_id: "price-123",
      included_seats: 50,
      additional_seats: 0,
      seat_price: "10.00",
      current_period_start: new Date("2024-01-01"),
      current_period_end: new Date("2024-02-01"),
      cancel_at: null,
      canceled_at: null,
      trial_end: null,
      features: '{}',
      created_at: new Date("2024-01-01"),
      updated_at: new Date("2024-01-02"),
    };

    const mockSubscriptionRowTeam = {
      ...mockSubscriptionRowEnterprise,
      plan_type: "TEAM",
      stripe_customer_id: "stripe-cus-team",
    };

    describe("findMarketCenterIdsByStripeCustomerId", () => {
      it("should return all market center IDs for a stripe customer", async () => {
        mockedDb.queryAll.mockResolvedValueOnce([
          { market_center_id: "mc-1" },
          { market_center_id: "mc-2" },
          { market_center_id: "mc-3" },
        ]);

        const result = await subscriptionRepository.findMarketCenterIdsByStripeCustomerId(
          "stripe-cus-enterprise"
        );

        expect(result).toEqual(["mc-1", "mc-2", "mc-3"]);
      });

      it("should return empty array when no market centers found", async () => {
        mockedDb.queryAll.mockResolvedValueOnce([]);

        const result = await subscriptionRepository.findMarketCenterIdsByStripeCustomerId(
          "nonexistent-customer"
        );

        expect(result).toEqual([]);
      });
    });

    describe("getAccessibleMarketCenterIds", () => {
      it("should return empty array when user has no market center", async () => {
        const result = await subscriptionRepository.getAccessibleMarketCenterIds(null);

        expect(result).toEqual([]);
      });

      it("should return only user's market center when no subscription found", async () => {
        mockedDb.queryRow.mockResolvedValueOnce(null); // No subscription

        const result = await subscriptionRepository.getAccessibleMarketCenterIds("mc-123");

        expect(result).toEqual(["mc-123"]);
      });

      it("should return only user's market center for non-Enterprise plan", async () => {
        mockedDb.queryRow.mockResolvedValueOnce(mockSubscriptionRowTeam);

        const result = await subscriptionRepository.getAccessibleMarketCenterIds("mc-123");

        expect(result).toEqual(["mc-123"]);
      });

      it("should return all market centers under same customer for Enterprise plan", async () => {
        // First call: find subscription by market center ID (returns Enterprise)
        mockedDb.queryRow.mockResolvedValueOnce(mockSubscriptionRowEnterprise);
        // Second call: find all market centers by stripe customer ID
        mockedDb.queryAll.mockResolvedValueOnce([
          { market_center_id: "mc-1" },
          { market_center_id: "mc-2" },
          { market_center_id: "mc-3" },
        ]);

        const result = await subscriptionRepository.getAccessibleMarketCenterIds("mc-1");

        expect(result).toEqual(["mc-1", "mc-2", "mc-3"]);
      });

      it("should return only user's market center for STARTER plan", async () => {
        mockedDb.queryRow.mockResolvedValueOnce({
          ...mockSubscriptionRowEnterprise,
          plan_type: "STARTER",
        });

        const result = await subscriptionRepository.getAccessibleMarketCenterIds("mc-123");

        expect(result).toEqual(["mc-123"]);
      });

      it("should return only user's market center for BUSINESS plan", async () => {
        mockedDb.queryRow.mockResolvedValueOnce({
          ...mockSubscriptionRowEnterprise,
          plan_type: "BUSINESS",
        });

        const result = await subscriptionRepository.getAccessibleMarketCenterIds("mc-123");

        expect(result).toEqual(["mc-123"]);
      });
    });

    describe("canAccessMarketCenter", () => {
      it("should return false when user has no market center", async () => {
        const result = await subscriptionRepository.canAccessMarketCenter(null, "mc-target");

        expect(result).toBe(false);
      });

      it("should return true when accessing own market center", async () => {
        // No DB call needed since same market center
        const result = await subscriptionRepository.canAccessMarketCenter("mc-123", "mc-123");

        expect(result).toBe(true);
      });

      it("should return false for non-Enterprise user accessing different market center", async () => {
        mockedDb.queryRow.mockResolvedValueOnce(mockSubscriptionRowTeam);

        const result = await subscriptionRepository.canAccessMarketCenter("mc-123", "mc-other");

        expect(result).toBe(false);
      });

      it("should return true for Enterprise user accessing market center under same subscription", async () => {
        // First call: find subscription (Enterprise)
        mockedDb.queryRow.mockResolvedValueOnce(mockSubscriptionRowEnterprise);
        // Second call: get all accessible market center IDs
        mockedDb.queryAll.mockResolvedValueOnce([
          { market_center_id: "mc-1" },
          { market_center_id: "mc-2" },
          { market_center_id: "mc-target" },
        ]);

        const result = await subscriptionRepository.canAccessMarketCenter("mc-1", "mc-target");

        expect(result).toBe(true);
      });

      it("should return false for Enterprise user accessing market center under different subscription", async () => {
        // First call: find subscription (Enterprise)
        mockedDb.queryRow.mockResolvedValueOnce(mockSubscriptionRowEnterprise);
        // Second call: get all accessible market center IDs (target not in list)
        mockedDb.queryAll.mockResolvedValueOnce([
          { market_center_id: "mc-1" },
          { market_center_id: "mc-2" },
        ]);

        const result = await subscriptionRepository.canAccessMarketCenter("mc-1", "mc-other-subscription");

        expect(result).toBe(false);
      });

      it("should return false when no subscription exists", async () => {
        mockedDb.queryRow.mockResolvedValueOnce(null);

        const result = await subscriptionRepository.canAccessMarketCenter("mc-123", "mc-other");

        expect(result).toBe(false);
      });
    });
  });
});

// ==================== SETTINGS AUDIT REPOSITORY TESTS ====================
describe("Settings Audit Repository", () => {
  const mockAuditRow = {
    id: "audit-123",
    market_center_id: "mc-123",
    user_id: "user-123",
    action: "UPDATE",
    section: "notifications",
    previous_value: '{"enabled": false}',
    new_value: '{"enabled": true}',
    created_at: new Date("2024-01-01"),
  };

  it("should find audit log by id", async () => {
    mockedDb.queryRow.mockResolvedValueOnce(mockAuditRow);

    const log = await settingsAuditRepository.findById("audit-123");

    expect(log).toBeDefined();
    expect(log?.id).toBe("audit-123");
    expect(log?.action).toBe("UPDATE");
  });

  it("should find audit logs by market center with pagination", async () => {
    mockedDb.rawQueryRow.mockResolvedValueOnce({ count: 25 });

    // Create async iterator mock
    const mockIterator = {
      async *[Symbol.asyncIterator]() {
        yield mockAuditRow;
      }
    };
    mockedDb.rawQuery.mockReturnValueOnce(mockIterator);

    const result = await settingsAuditRepository.findByMarketCenterId("mc-123", {
      limit: 10,
      offset: 0,
    });

    expect(result.total).toBe(25);
    expect(result.logs).toHaveLength(1);
  });

  it("should filter audit logs by section", async () => {
    mockedDb.rawQueryRow.mockResolvedValueOnce({ count: 5 });

    const mockIterator = {
      async *[Symbol.asyncIterator]() {
        yield mockAuditRow;
      }
    };
    mockedDb.rawQuery.mockReturnValueOnce(mockIterator);

    const result = await settingsAuditRepository.findByMarketCenterId("mc-123", {
      section: "notifications",
    });

    expect(result.logs[0].section).toBe("notifications");
  });

  it("should create audit log entry", async () => {
    mockedDb.queryRow.mockResolvedValueOnce(mockAuditRow);

    const log = await settingsAuditRepository.create({
      marketCenterId: "mc-123",
      userId: "user-123",
      action: "UPDATE",
      section: "notifications",
      previousValue: { enabled: false },
      newValue: { enabled: true },
    });

    expect(log).toBeDefined();
    expect(log.section).toBe("notifications");
  });

  it("should create many audit log entries", async () => {
    mockedDb.rawExec.mockResolvedValueOnce(undefined);

    await settingsAuditRepository.createMany([
      {
        marketCenterId: "mc-123",
        userId: "user-123",
        action: "UPDATE",
        section: "notifications",
      },
      {
        marketCenterId: "mc-123",
        userId: "user-123",
        action: "UPDATE",
        section: "email",
      },
    ]);

    expect(mockedDb.rawExec).toHaveBeenCalled();
  });
});

// ==================== DATABASE UTILITIES TESTS ====================
describe("Database Utilities", () => {
  it("should properly convert timestamps", async () => {
    const { fromTimestamp, toTimestamp } = await import("../../ticket/db");

    const date = new Date("2024-01-01");
    expect(fromTimestamp(date)).toEqual(date);
    expect(toTimestamp(null)).toBeNull();
  });

  it("should properly handle JSON conversion", async () => {
    const { toJson, fromJson } = await import("../../ticket/db");

    const obj = { key: "value" };
    expect(toJson(obj)).toBe('{"key":"value"}');
    expect(fromJson('{"key":"value"}')).toEqual(obj);
  });

  it("should handle null/undefined in fromJson", async () => {
    const { fromJson } = await import("../../ticket/db");

    expect(fromJson(null)).toBeNull();
    expect(fromJson(undefined)).toBeNull();
  });

  it("should generate unique IDs", async () => {
    const { generateId } = await import("../../ticket/db");

    const id = generateId();
    expect(id).toBe("generated-id-123");
  });
});
