export enum TicketStatus {
  ASSIGNED = 'ASSIGNED',
  AWAITING_RESPONSE = 'AWAITING_RESPONSE',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED'
}

export enum Urgency {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW'
}

export enum UserRole {
  AGENT = 'AGENT',
  STAFF = 'STAFF',
  ADMIN = 'ADMIN'
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  urgency: Urgency;
  category: string;
  creatorId: string;
  creator?: User;
  assigneeId?: string;
  assignee?: User;
  comments?: TicketComment[];
  dueDate?: Date;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TicketComment {
  id: string;
  content: string;
  ticketId: string;
  ticket?: Ticket;
  userId: string;
  user?: User;
  internal: boolean;
  createdAt: Date;
}

export interface CreateTicketRequest {
  title: string;
  description: string;
  category: string;
  urgency: Urgency;
  dueDate?: string;
}

export interface UpdateTicketRequest {
  title?: string;
  description?: string;
  status?: TicketStatus;
  urgency?: Urgency;
  category?: string;
  dueDate?: string;
}

export interface AssignTicketRequest {
  assigneeId: string;
}

export interface CreateCommentRequest {
  content: string;
  internal?: boolean;
}

export interface TicketFilters {
  status?: TicketStatus;
  urgency?: Urgency;
  assigneeId?: string;
  creatorId?: string;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface TicketListResponse {
  tickets: Ticket[];
  total: number;
  page: number;
  limit: number;
}