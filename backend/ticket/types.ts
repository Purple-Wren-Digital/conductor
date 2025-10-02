import { MarketCenter } from "../marketCenters/types";

export type UserRole = "AGENT" | "STAFF" | "ADMIN";
export type TicketStatus =
  | "DRAFT"
  | "ASSIGNED"
  | "AWAITING_RESPONSE"
  | "IN_PROGRESS"
  | "RESOLVED";
export type Urgency = "HIGH" | "MEDIUM" | "LOW";

export type TicketField =
  | "isActive"
  | "title"
  | "description"
  | "status"
  | "urgency"
  | "category"
  | "assigneeId"
  | "dueDate";

export type UserFields =
  | "name"
  | "email"
  | "role"
  | "isActive"
  | "marketCenterId"
  | "ticketAssignment"
  | "ticketCreation";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  auth0Id: string;
  marketCenterId: string | null;
  marketCenter?: MarketCenter;
  ticketHistory?: TicketHistory[];
  userHistory?: UserHistory[];
  otherUsersChanges?: UserHistory[];
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  urgency: Urgency;
  category: string;
  creatorId?: string;
  assigneeId?: string | null;
  dueDate: Date | null;
  resolvedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  creator?: User;
  assignee?: User | null;
  commentCount?: number | null;
  deletedAt?: Date | null;
  isActive?: boolean;
  ticketHistory: TicketHistory[];
}

export interface Comment {
  id: string;
  content: string;
  ticketId: string;
  userId: string;
  internal: boolean;
  createdAt: Date;
  user?: User;
}

export interface TicketFilters {
  status?: TicketStatus[];
  urgency?: Urgency[];
  assigneeId?: string;
  creatorId?: string;
  category?: string;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}

export interface DashboardMetrics {
  totalTickets: number;
  openTickets: number;
  overdueTickets: number;
  avgResponseTime: number;
  ticketsByStatus: Record<TicketStatus, number>;
  ticketsByUrgency: Record<Urgency, number>;
}

export interface TicketHistory {
  id: string;
  ticketId: string;
  field: string;
  previousValue: string;
  newValue: string;
  snapshot?: {}; // Ticket as it was in this moment
  changedAt: Date;
  changedById: string;
  changedBy?: User;
}

export interface UserHistory {
  id: string;
  userId: string;
  marketCenterId: string;
  field: string;
  previousValue: string;
  newValue: string;
  snapshot?: {}; // User as they were in this moment
  changedAt: Date;
  changedById: string;
  changedBy?: User;
  user?: User;
}
