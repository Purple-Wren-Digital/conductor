import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { calculateStaffStats, type StaffMember } from "./staff-stats";
import type { Ticket, TicketStatus } from "@/lib/types";

describe("calculateStaffStats", () => {
  const mockStaffMembers: StaffMember[] = [
    { id: "staff-1", name: "John Doe", role: "STAFF" },
    { id: "staff-2", name: "Jane Smith", role: "STAFF_LEADER" },
    { id: "agent-1", name: "Agent Bob", role: "AGENT" }, // Should be filtered out
  ];

  const createTicket = (overrides: Partial<Ticket> & { status: TicketStatus }): Ticket => {
    const { status, ...rest } = overrides;
    return {
      id: "ticket-1",
      title: "Test Ticket",
      description: "Test Description",
      status,
      urgency: "MEDIUM",
      creatorId: "creator-1",
      assigneeId: null,
      dueDate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ticketHistory: [],
      ...rest,
    };
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should filter out AGENT role from team members", () => {
    const stats = calculateStaffStats(mockStaffMembers, []);

    expect(stats["staff-1"]).toBeDefined();
    expect(stats["staff-2"]).toBeDefined();
    expect(stats["agent-1"]).toBeUndefined();
  });

  it("should count active tickets excluding RESOLVED status", () => {
    const tickets: Ticket[] = [
      createTicket({ id: "t1", assigneeId: "staff-1", status: "ASSIGNED" }),
      createTicket({ id: "t2", assigneeId: "staff-1", status: "IN_PROGRESS" }),
      createTicket({ id: "t3", assigneeId: "staff-1", status: "RESOLVED" }),
    ];

    const stats = calculateStaffStats(mockStaffMembers, tickets);

    expect(stats["staff-1"].active).toBe(2); // ASSIGNED + IN_PROGRESS
    expect(stats["staff-1"].resolved).toBe(1);
  });

  it("should count active tickets excluding DRAFT status", () => {
    const tickets: Ticket[] = [
      createTicket({ id: "t1", assigneeId: "staff-1", status: "ASSIGNED" }),
      createTicket({ id: "t2", assigneeId: "staff-1", status: "DRAFT" }),
      createTicket({ id: "t3", assigneeId: "staff-1", status: "IN_PROGRESS" }),
    ];

    const stats = calculateStaffStats(mockStaffMembers, tickets);

    expect(stats["staff-1"].active).toBe(2); // ASSIGNED + IN_PROGRESS (not DRAFT)
    expect(stats["staff-1"].assigned).toBe(3); // DRAFT is included in assigned (not resolved)
  });

  it("should count active tickets excluding both RESOLVED and DRAFT", () => {
    const tickets: Ticket[] = [
      createTicket({ id: "t1", assigneeId: "staff-1", status: "ASSIGNED" }),
      createTicket({ id: "t2", assigneeId: "staff-1", status: "DRAFT" }),
      createTicket({ id: "t3", assigneeId: "staff-1", status: "RESOLVED" }),
      createTicket({ id: "t4", assigneeId: "staff-1", status: "IN_PROGRESS" }),
      createTicket({ id: "t5", assigneeId: "staff-1", status: "AWAITING_RESPONSE" }),
      createTicket({ id: "t6", assigneeId: "staff-1", status: "CREATED" }),
      createTicket({ id: "t7", assigneeId: "staff-1", status: "UNASSIGNED" }),
    ];

    const stats = calculateStaffStats(mockStaffMembers, tickets);

    // Active: ASSIGNED, IN_PROGRESS, AWAITING_RESPONSE, CREATED, UNASSIGNED (5)
    // Excluded from active: DRAFT, RESOLVED
    expect(stats["staff-1"].active).toBe(5);

    // Assigned: All non-resolved (6)
    expect(stats["staff-1"].assigned).toBe(6);

    // Resolved: 1
    expect(stats["staff-1"].resolved).toBe(1);
  });

  it("should count overdue tickets correctly", () => {
    const pastDate = new Date("2025-01-10T12:00:00Z"); // 5 days ago
    const futureDate = new Date("2025-01-20T12:00:00Z"); // 5 days in future

    const tickets: Ticket[] = [
      createTicket({ id: "t1", assigneeId: "staff-1", status: "ASSIGNED", dueDate: pastDate }),
      createTicket({ id: "t2", assigneeId: "staff-1", status: "IN_PROGRESS", dueDate: pastDate }),
      createTicket({ id: "t3", assigneeId: "staff-1", status: "RESOLVED", dueDate: pastDate }), // Resolved, not overdue
      createTicket({ id: "t4", assigneeId: "staff-1", status: "ASSIGNED", dueDate: futureDate }), // Future, not overdue
      createTicket({ id: "t5", assigneeId: "staff-1", status: "ASSIGNED", dueDate: null }), // No due date
    ];

    const stats = calculateStaffStats(mockStaffMembers, tickets);

    expect(stats["staff-1"].overdue).toBe(2); // Only t1 and t2
  });

  it("should handle tickets assigned to different staff members", () => {
    const tickets: Ticket[] = [
      createTicket({ id: "t1", assigneeId: "staff-1", status: "ASSIGNED" }),
      createTicket({ id: "t2", assigneeId: "staff-1", status: "IN_PROGRESS" }),
      createTicket({ id: "t3", assigneeId: "staff-2", status: "ASSIGNED" }),
      createTicket({ id: "t4", assigneeId: "staff-2", status: "RESOLVED" }),
    ];

    const stats = calculateStaffStats(mockStaffMembers, tickets);

    expect(stats["staff-1"].active).toBe(2);
    expect(stats["staff-1"].resolved).toBe(0);

    expect(stats["staff-2"].active).toBe(1);
    expect(stats["staff-2"].resolved).toBe(1);
  });

  it("should return zero counts for staff with no tickets", () => {
    const stats = calculateStaffStats(mockStaffMembers, []);

    expect(stats["staff-1"].active).toBe(0);
    expect(stats["staff-1"].assigned).toBe(0);
    expect(stats["staff-1"].resolved).toBe(0);
    expect(stats["staff-1"].overdue).toBe(0);
  });

  it("should not count unassigned tickets towards any staff member", () => {
    const tickets: Ticket[] = [
      createTicket({ id: "t1", assigneeId: null, status: "UNASSIGNED" }),
      createTicket({ id: "t2", assigneeId: "staff-1", status: "ASSIGNED" }),
    ];

    const stats = calculateStaffStats(mockStaffMembers, tickets);

    expect(stats["staff-1"].active).toBe(1);
    expect(stats["staff-2"].active).toBe(0);
  });
});
