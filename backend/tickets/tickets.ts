import { api } from "encore.dev/api";
// import { auth } from "../auth/auth";
import { getAuthData } from "~encore/auth";
import {
  Ticket,
  CreateTicketRequest,
  UpdateTicketRequest,
  AssignTicketRequest,
  CreateCommentRequest,
  TicketFilters,
  TicketListResponse,
  TicketStatus,
  Priority,
  UserRole,
  TicketComment
} from "../types";

// Mock data storage - replace with actual database
let tickets: Ticket[] = [];
let comments: TicketComment[] = [];
let ticketCounter = 1;
let commentCounter = 1;

/**
 * Create a new ticket
 */
export const createTicket = api(
  { method: "POST", expose: true, auth: true, path: "/tickets" },
  async (req: CreateTicketRequest): Promise<Ticket> => {
    const user = getAuthData();
    
    const ticket: Ticket = {
      id: `ticket_${ticketCounter++}`,
      title: req.title,
      description: req.description,
      status: TicketStatus.ASSIGNED,
      priority: req.priority,
      category: req.category,
      creatorId: user.userID,
      dueDate: req.dueDate ? new Date(req.dueDate) : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    tickets.push(ticket);
    return ticket;
  }
);

/**
 * Get all tickets with optional filtering
 */
export const getTickets = api(
  { method: "GET", expose: true, auth: true, path: "/tickets" },
  async (req: TicketFilters & { page?: number; limit?: number }): Promise<TicketListResponse> => {
    const user = getAuthData();
    const page = req.page || 1;
    const limit = req.limit || 20;
    
    let filteredTickets = tickets;

    // Role-based filtering
    if (user.role === UserRole.AGENT) {
      filteredTickets = tickets.filter(t => t.creatorId === user.userID);
    }

    // Apply filters
    if (req.status) {
      filteredTickets = filteredTickets.filter(t => t.status === req.status);
    }
    if (req.priority) {
      filteredTickets = filteredTickets.filter(t => t.priority === req.priority);
    }
    if (req.assigneeId) {
      filteredTickets = filteredTickets.filter(t => t.assigneeId === req.assigneeId);
    }
    if (req.creatorId) {
      filteredTickets = filteredTickets.filter(t => t.creatorId === req.creatorId);
    }
    if (req.category) {
      filteredTickets = filteredTickets.filter(t => t.category.toLowerCase().includes(req.category!.toLowerCase()));
    }
    if (req.search) {
      const searchLower = req.search.toLowerCase();
      filteredTickets = filteredTickets.filter(t => 
        t.title.toLowerCase().includes(searchLower) ||
        t.description.toLowerCase().includes(searchLower)
      );
    }

    // Date filtering
    if (req.dateFrom) {
      const fromDate = new Date(req.dateFrom);
      filteredTickets = filteredTickets.filter(t => t.createdAt >= fromDate);
    }
    if (req.dateTo) {
      const toDate = new Date(req.dateTo);
      filteredTickets = filteredTickets.filter(t => t.createdAt <= toDate);
    }

    // Pagination
    const startIndex = (page - 1) * limit;
    const paginatedTickets = filteredTickets.slice(startIndex, startIndex + limit);

    return {
      tickets: paginatedTickets,
      total: filteredTickets.length,
      page,
      limit
    };
  }
);

/**
 * Get a specific ticket by ID
 */
export const getTicket = api(
  { method: "GET", expose: true, auth: true, path: "/tickets/:id" },
  async ({ id }: { id: string }): Promise<Ticket> => {
    const user = getAuthData();
    const ticket = tickets.find(t => t.id === id);
    
    if (!ticket) {
      throw new Error("Ticket not found");
    }

    // Check permissions - agents can only view their own tickets
    if (user.role === UserRole.AGENT && ticket.creatorId !== user.userID) {
      throw new Error("Unauthorized to view this ticket");
    }

    // Add comments to ticket
    const ticketComments = comments.filter(c => c.ticketId === id);
    return {
      ...ticket,
      comments: ticketComments
    };
  }
);

/**
 * Update a ticket
 */
export const updateTicket = api(
  { method: "PUT", expose: true, auth: true, path: "/tickets/:id" },
  async ({ id, ...updates }: { id: string } & UpdateTicketRequest): Promise<Ticket> => {
    const user = getAuthData();
    const ticketIndex = tickets.findIndex(t => t.id === id);
    
    if (ticketIndex === -1) {
      throw new Error("Ticket not found");
    }

    const ticket = tickets[ticketIndex];

    // Check permissions
    if (user.role === UserRole.AGENT && ticket.creatorId !== user.userID) {
      throw new Error("Unauthorized to update this ticket");
    }

    // Update ticket
    tickets[ticketIndex] = {
      ...ticket,
      ...updates,
      dueDate: updates.dueDate ? new Date(updates.dueDate) : ticket.dueDate,
      resolvedAt: updates.status === TicketStatus.RESOLVED ? new Date() : ticket.resolvedAt,
      updatedAt: new Date()
    };

    return tickets[ticketIndex];
  }
);

/**
 * Delete a ticket
 */
export const deleteTicket = api(
  { method: "DELETE", expose: true, auth: true, path: "/tickets/:id" },
  async ({ id }: { id: string }): Promise<{ success: boolean }> => {
    const user = getAuthData();
    
    // Only admins can delete tickets
    if (user.role !== UserRole.ADMIN) {
      throw new Error("Unauthorized to delete tickets");
    }

    const ticketIndex = tickets.findIndex(t => t.id === id);
    
    if (ticketIndex === -1) {
      throw new Error("Ticket not found");
    }

    // Remove ticket and its comments
    tickets.splice(ticketIndex, 1);
    comments = comments.filter(c => c.ticketId !== id);

    return { success: true };
  }
);

/**
 * Assign a ticket to a user
 */
export const assignTicket = api(
  { method: "POST", expose: true, auth: true, path: "/tickets/:id/assign" },
  async ({ id, assigneeId }: { id: string; assigneeId: string }): Promise<Ticket> => {
    const user = getAuthData();
    
    // Only staff and admins can assign tickets
    if (user.role === UserRole.AGENT) {
      throw new Error("Unauthorized to assign tickets");
    }

    const ticketIndex = tickets.findIndex(t => t.id === id);
    
    if (ticketIndex === -1) {
      throw new Error("Ticket not found");
    }

    tickets[ticketIndex] = {
      ...tickets[ticketIndex],
      assigneeId,
      updatedAt: new Date()
    };

    return tickets[ticketIndex];
  }
);

/**
 * Add a comment to a ticket
 */
export const addComment = api(
  { method: "POST", expose: true, auth: true, path: "/tickets/:id/comments" },
  async ({ id, ...commentData }: { id: string } & CreateCommentRequest): Promise<TicketComment> => {
    const user = getAuthData();
    const ticket = tickets.find(t => t.id === id);
    
    if (!ticket) {
      throw new Error("Ticket not found");
    }

    // Check permissions - agents can only comment on their own tickets
    if (user.role === UserRole.AGENT && ticket.creatorId !== user.userID) {
      throw new Error("Unauthorized to comment on this ticket");
    }

    const comment: TicketComment = {
      id: `comment_${commentCounter++}`,
      content: commentData.content,
      ticketId: id,
      userId: user.userID,
      internal: commentData.internal || false,
      createdAt: new Date(),
      type: '',
    };

    comments.push(comment);

    // Update ticket's updatedAt timestamp
    const ticketIndex = tickets.findIndex(t => t.id === id);
    if (ticketIndex !== -1) {
      tickets[ticketIndex].updatedAt = new Date();
    }

    return comment;
  }
);

/**
 * Get comments for a ticket
 */
interface GetCommentsResponse {
  comments: TicketComment[];
}

export const getTicketComments = api(
  { method: "GET", expose: true, auth: true, path: "/tickets/:id/comments" },
  async ({ id }: { id: string }): Promise<GetCommentsResponse> => {
    const user = getAuthData();
    const ticket = tickets.find(t => t.id === id);
    
    if (!ticket) {
      throw new Error("Ticket not found");
    }

    // Check permissions
    if (user.role === UserRole.AGENT && ticket.creatorId !== user.userID) {
      throw new Error("Unauthorized to view comments on this ticket");
    }

    const ticketComments = comments.filter(c => c.ticketId === id);

    // Filter out internal comments for agents
    if (user.role === UserRole.AGENT) {
      return { comments: ticketComments.filter(c => !c.internal) };
    }

    return { comments: ticketComments };
  }
);