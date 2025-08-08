export enum TicketStatus {
  CREATED = 'CREATED',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  AWAITING_RESPONSE = 'AWAITING_RESPONSE',
  PENDING = 'PENDING',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
}

export enum Priority {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW'
}

export enum UserRole {
  AGENT = 'AGENT',
  STAFF = 'STAFF',
  ADMIN = 'ADMIN'
}

export enum CommentType {
    CANCEL = 'CANCEL',
    FEEDBACK = 'FEEDBACK',
    FOLLOW_UP = 'FOLLOW_UP',
    ISSUE = 'ISSUE',
    NOTE = 'NOTE',
    REMINDER = 'REMINDER',
    QUESTION = 'QUESTION',
}

export interface User {
  id: string;
  auth0Id: string;
  createdAt: Date;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  marketCenterId: string;
  marketCenter: any;
  ticketsCreated: Ticket[];
  ticketsAssigned: Ticket[]
  comments?: TicketComment[]
}

export interface  MarketCenter {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  name: string;
  code: string;
  region: string;
  timezon: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
  tickets: Ticket[];
  users: User[];
}

export interface Ticket {
  id: string;
  createdAt: Date;
  updatedAt?: Date;
  dueDate?: Date;
  resolvedAt?: Date;
  creator?: User;
  creatorId: string;
  assignee?: User;
  assigneeId?: string;
  title: string;
  description: string;
  category: string;
  priority: Priority;
  comments?: TicketComment[];
  status: TicketStatus;
  statusHistory?: TicketStatusHistory[];
  internal?: boolean;
}

export interface TicketComment {
  id: string;
  createdAt: Date;
  userId: string;
  user?: User;
  ticketId: string;
  ticket?: Ticket;
  type: string;
  content: string;
  internal: boolean;
}

export interface  TicketStatusHistory {
    id: string;
    updatedAt: Date;
    ticketId: string;
    ticket: Ticket;
    status: TicketStatus;
}

export interface CreateTicketRequest {
  title: string;
  description: string;
  category: string;
  priority: Priority;
  dueDate?: string;
}

export interface UpdateTicketRequest {
  title?: string;
  description?: string;
  status?: TicketStatus;
  priority?: Priority;
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
  priority?: Priority;
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