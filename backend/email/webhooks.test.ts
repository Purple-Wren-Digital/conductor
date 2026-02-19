import { describe, it, expect, vi, beforeEach } from "vitest";
import { Readable } from "stream";

// Mock hoisted values
const {
  mockUserRepository,
  mockTicketRepository,
  mockCommentRepository,
} = vi.hoisted(() => ({
  mockUserRepository: {
    findByEmail: vi.fn(),
  },
  mockTicketRepository: {
    findById: vi.fn(),
    update: vi.fn(),
  },
  mockCommentRepository: {
    create: vi.fn(),
  },
}));

// Mock encore.dev/api
vi.mock("encore.dev/api", () => {
  const api = Object.assign(
    vi.fn((config, handler) => handler),
    {
      raw: vi.fn((options, handler) => handler),
      streamOut: vi.fn((options, handler) => handler),
    }
  );
  return { api, APIError: class APIError extends Error {} };
});

// Mock repositories
vi.mock("../shared/repositories", () => ({
  userRepository: mockUserRepository,
  ticketRepository: mockTicketRepository,
  commentRepository: mockCommentRepository,
}));

import { inboundEmail, webhookHealth } from "./webhooks";

// Helper to create a mock request (readable stream) from a payload object
function createMockReq(payload: any): Readable {
  const body = JSON.stringify(payload);
  const readable = new Readable({
    read() {
      this.push(Buffer.from(body));
      this.push(null);
    },
  });
  return readable;
}

// Helper to create a mock response that captures output
function createMockRes() {
  let statusCode = 0;
  let body = "";
  return {
    writeHead: vi.fn((code: number) => { statusCode = code; }),
    end: vi.fn((data: string) => { body = data; }),
    getStatus: () => statusCode,
    getBody: () => JSON.parse(body),
  };
}

// Fixtures
const TICKET_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
const USER_ID = "user-123";

const mockUser = {
  id: USER_ID,
  email: "agent@example.com",
  name: "Test Agent",
  role: "AGENT" as const,
  clerkId: "clerk_123",
  marketCenterId: "mc-1",
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockStaffUser = {
  ...mockUser,
  id: "staff-456",
  email: "staff@example.com",
  role: "STAFF" as const,
};

const mockTicket = {
  id: TICKET_ID,
  title: "Test Ticket",
  description: "Test description",
  status: "IN_PROGRESS" as const,
  urgency: "MEDIUM" as const,
  creatorId: USER_ID,
  assigneeId: "staff-456",
  categoryId: null,
  dueDate: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  resolvedAt: null,
};

function makePayload(overrides?: Partial<any>) {
  return {
    type: "email.received",
    data: {
      email_id: "email-abc-123",
      from: "Test Agent <agent@example.com>",
      to: [`ticket-${TICKET_ID}@reply.conductortickets.com`],
      subject: `Re: Ticket #${TICKET_ID}`,
      text: "This is my reply to the ticket.",
      ...overrides?.data,
    },
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("Email Webhook - inboundEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should process a valid email reply and create a comment", async () => {
    mockUserRepository.findByEmail.mockResolvedValue(mockUser);
    mockTicketRepository.findById.mockResolvedValue(mockTicket);
    mockCommentRepository.create.mockResolvedValue({
      id: "comment-1",
      content: "This is my reply to the ticket.",
      ticketId: TICKET_ID,
      userId: USER_ID,
      source: "EMAIL",
      internal: false,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const req = createMockReq(makePayload());
    const res = createMockRes();

    await (inboundEmail as any)(req, res);

    expect(mockUserRepository.findByEmail).toHaveBeenCalledWith("agent@example.com");
    expect(mockTicketRepository.findById).toHaveBeenCalledWith(TICKET_ID);
    expect(mockCommentRepository.create).toHaveBeenCalledWith({
      content: "This is my reply to the ticket.",
      ticketId: TICKET_ID,
      userId: USER_ID,
      source: "EMAIL",
      metadata: expect.objectContaining({
        source: "EMAIL",
        email_id: "email-abc-123",
        from: "Test Agent <agent@example.com>",
      }),
    });
    expect(res.writeHead).toHaveBeenCalledWith(200, { "Content-Type": "application/json" });
    expect(res.getBody()).toEqual(
      expect.objectContaining({ success: true, commentId: "comment-1" })
    );
  });

  it("should skip non email.received events", async () => {
    const req = createMockReq(makePayload({ type: "email.delivered" }));
    const res = createMockRes();

    await (inboundEmail as any)(req, res);

    expect(mockUserRepository.findByEmail).not.toHaveBeenCalled();
    expect(res.getBody()).toEqual({ message: "Event type not processed" });
  });

  it("should return 200 when ticket ID cannot be extracted", async () => {
    const req = createMockReq(makePayload({
      data: {
        email_id: "email-abc",
        from: "agent@example.com",
        to: ["random@reply.conductortickets.com"],
        subject: "Re: something",
        text: "hello",
      },
    }));
    const res = createMockRes();

    await (inboundEmail as any)(req, res);

    expect(mockUserRepository.findByEmail).not.toHaveBeenCalled();
    expect(res.getBody()).toEqual({ message: "No ticket ID found" });
  });

  it("should return 200 when user is not found", async () => {
    mockUserRepository.findByEmail.mockResolvedValue(null);

    const req = createMockReq(makePayload());
    const res = createMockRes();

    await (inboundEmail as any)(req, res);

    expect(mockUserRepository.findByEmail).toHaveBeenCalledWith("agent@example.com");
    expect(mockCommentRepository.create).not.toHaveBeenCalled();
    expect(res.getBody()).toEqual({ message: "User not found" });
  });

  it("should return 200 when ticket is not found", async () => {
    mockUserRepository.findByEmail.mockResolvedValue(mockUser);
    mockTicketRepository.findById.mockResolvedValue(null);

    const req = createMockReq(makePayload());
    const res = createMockRes();

    await (inboundEmail as any)(req, res);

    expect(mockTicketRepository.findById).toHaveBeenCalledWith(TICKET_ID);
    expect(mockCommentRepository.create).not.toHaveBeenCalled();
    expect(res.getBody()).toEqual({ message: "Ticket not found" });
  });

  it("should deny an agent who is not the creator or assignee", async () => {
    const unrelatedAgent = {
      ...mockUser,
      id: "other-agent-789",
      email: "other@example.com",
    };
    mockUserRepository.findByEmail.mockResolvedValue(unrelatedAgent);
    mockTicketRepository.findById.mockResolvedValue(mockTicket);

    const req = createMockReq(makePayload({
      data: {
        email_id: "email-abc",
        from: "other@example.com",
        to: [`ticket-${TICKET_ID}@reply.conductortickets.com`],
        subject: "Re: ticket",
        text: "I shouldn't be able to comment",
      },
    }));
    const res = createMockRes();

    await (inboundEmail as any)(req, res);

    expect(mockCommentRepository.create).not.toHaveBeenCalled();
    expect(res.getBody()).toEqual({ message: "Permission denied" });
  });

  it("should allow staff to comment on any ticket", async () => {
    mockUserRepository.findByEmail.mockResolvedValue(mockStaffUser);
    mockTicketRepository.findById.mockResolvedValue({
      ...mockTicket,
      creatorId: "someone-else",
      assigneeId: "another-person",
    });
    mockCommentRepository.create.mockResolvedValue({
      id: "comment-2",
      content: "Staff reply",
      ticketId: TICKET_ID,
      userId: mockStaffUser.id,
      source: "EMAIL",
      internal: false,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const req = createMockReq(makePayload({
      data: {
        email_id: "email-abc",
        from: "staff@example.com",
        to: [`ticket-${TICKET_ID}@reply.conductortickets.com`],
        subject: "Re: ticket",
        text: "Staff reply",
      },
    }));
    const res = createMockRes();

    await (inboundEmail as any)(req, res);

    expect(mockCommentRepository.create).toHaveBeenCalled();
    expect(res.getBody()).toEqual(
      expect.objectContaining({ success: true })
    );
  });

  it("should reopen a resolved ticket when a reply comes in", async () => {
    const resolvedTicket = { ...mockTicket, status: "RESOLVED" as const };
    mockUserRepository.findByEmail.mockResolvedValue(mockUser);
    mockTicketRepository.findById.mockResolvedValue(resolvedTicket);
    mockTicketRepository.update.mockResolvedValue({ ...resolvedTicket, status: "AWAITING_RESPONSE" });
    mockCommentRepository.create.mockResolvedValue({
      id: "comment-3",
      content: "Reopening reply",
      ticketId: TICKET_ID,
      userId: USER_ID,
      source: "EMAIL",
      internal: false,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const req = createMockReq(makePayload({
      data: {
        email_id: "email-abc",
        from: "agent@example.com",
        to: [`ticket-${TICKET_ID}@reply.conductortickets.com`],
        subject: "Re: ticket",
        text: "Reopening reply",
      },
    }));
    const res = createMockRes();

    await (inboundEmail as any)(req, res);

    expect(mockTicketRepository.update).toHaveBeenCalledWith(TICKET_ID, {
      status: "AWAITING_RESPONSE",
    });
    expect(res.getBody()).toEqual(
      expect.objectContaining({ success: true })
    );
  });

  it("should NOT update ticket status if not resolved", async () => {
    mockUserRepository.findByEmail.mockResolvedValue(mockUser);
    mockTicketRepository.findById.mockResolvedValue(mockTicket); // status: IN_PROGRESS
    mockCommentRepository.create.mockResolvedValue({
      id: "comment-4",
      content: "Just a reply",
      ticketId: TICKET_ID,
      userId: USER_ID,
      source: "EMAIL",
      internal: false,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const req = createMockReq(makePayload());
    const res = createMockRes();

    await (inboundEmail as any)(req, res);

    expect(mockTicketRepository.update).not.toHaveBeenCalled();
    expect(res.getBody()).toEqual(
      expect.objectContaining({ success: true })
    );
  });

  it("should handle HTML-only emails by stripping tags", async () => {
    mockUserRepository.findByEmail.mockResolvedValue(mockUser);
    mockTicketRepository.findById.mockResolvedValue(mockTicket);
    mockCommentRepository.create.mockResolvedValue({
      id: "comment-5",
      content: "Hello from HTML",
      ticketId: TICKET_ID,
      userId: USER_ID,
      source: "EMAIL",
      internal: false,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const req = createMockReq(makePayload({
      data: {
        email_id: "email-abc",
        from: "agent@example.com",
        to: [`ticket-${TICKET_ID}@reply.conductortickets.com`],
        subject: "Re: ticket",
        text: "",
        html: "<p>Hello from HTML</p>",
      },
    }));
    const res = createMockRes();

    await (inboundEmail as any)(req, res);

    expect(mockCommentRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ content: "Hello from HTML" })
    );
  });

  it("should reject emails with empty content after cleaning", async () => {
    mockUserRepository.findByEmail.mockResolvedValue(mockUser);
    mockTicketRepository.findById.mockResolvedValue(mockTicket);

    const req = createMockReq(makePayload({
      data: {
        email_id: "email-abc",
        from: "agent@example.com",
        to: [`ticket-${TICKET_ID}@reply.conductortickets.com`],
        subject: "Re: ticket",
        text: "> This is all quoted text\n> More quoted text",
      },
    }));
    const res = createMockRes();

    await (inboundEmail as any)(req, res);

    expect(mockCommentRepository.create).not.toHaveBeenCalled();
    expect(res.getBody()).toEqual({ message: "Empty email content" });
  });

  it("should strip email signatures from content", async () => {
    mockUserRepository.findByEmail.mockResolvedValue(mockUser);
    mockTicketRepository.findById.mockResolvedValue(mockTicket);
    mockCommentRepository.create.mockResolvedValue({
      id: "comment-6",
      content: "Actual reply content",
      ticketId: TICKET_ID,
      userId: USER_ID,
      source: "EMAIL",
      internal: false,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const req = createMockReq(makePayload({
      data: {
        email_id: "email-abc",
        from: "agent@example.com",
        to: [`ticket-${TICKET_ID}@reply.conductortickets.com`],
        subject: "Re: ticket",
        text: "Actual reply content\n\n-- \nJohn Doe\nSent from my iPhone",
      },
    }));
    const res = createMockRes();

    await (inboundEmail as any)(req, res);

    expect(mockCommentRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ content: "Actual reply content" })
    );
  });

  it("should extract email from angle bracket format", async () => {
    mockUserRepository.findByEmail.mockResolvedValue(mockUser);
    mockTicketRepository.findById.mockResolvedValue(mockTicket);
    mockCommentRepository.create.mockResolvedValue({
      id: "comment-7",
      content: "Reply",
      ticketId: TICKET_ID,
      userId: USER_ID,
      source: "EMAIL",
      internal: false,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const req = createMockReq(makePayload({
      data: {
        email_id: "email-abc",
        from: "John Doe <Agent@Example.com>",
        to: [`ticket-${TICKET_ID}@reply.conductortickets.com`],
        subject: "Re: ticket",
        text: "Reply",
      },
    }));
    const res = createMockRes();

    await (inboundEmail as any)(req, res);

    // Should lowercase the email
    expect(mockUserRepository.findByEmail).toHaveBeenCalledWith("agent@example.com");
  });

  it("should return 500 on unexpected errors", async () => {
    mockUserRepository.findByEmail.mockRejectedValue(new Error("DB connection failed"));

    const req = createMockReq(makePayload());
    const res = createMockRes();

    await (inboundEmail as any)(req, res);

    expect(res.writeHead).toHaveBeenCalledWith(500, { "Content-Type": "application/json" });
    expect(res.getBody()).toEqual({ error: "Internal server error" });
  });
});

describe("Email Webhook - webhookHealth", () => {
  it("should return healthy status", async () => {
    const result = await (webhookHealth as any)();
    expect(result).toEqual({ status: "healthy" });
  });
});
