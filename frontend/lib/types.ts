import { Dispatch, SetStateAction } from "react";

export type AppContext = {
  prismaUser: PrismaUser | null;
  setPrismaUser: Dispatch<SetStateAction<PrismaUser | null>>;
};

export type UserRole = "AGENT" | "STAFF" | "ADMIN";
export type TicketStatus =
  | "ASSIGNED"
  | "AWAITING_RESPONSE"
  | "IN_PROGRESS"
  | "RESOLVED";
export type Urgency = "HIGH" | "MEDIUM" | "LOW";

export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  urgency: Urgency;
  category: string;
  creator: PrismaUser | null;
  assignee: PrismaUser | null;
  dueDate: Date | null;
  createdAt: Date;
  commentCount: number | null;
  updatedAt?: Date | string;
  comments?: Comment[];
}

export interface PrismaUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
  updatedAt?: Date;
  isActive: boolean;
  auth0Id: string;
}

export interface Comment {
  id: string;
  content: string;
  ticketId: string;
  userId: string;
  internal: boolean;
  createdAt: Date;
  updatedAt?: Date;
  user?: PrismaUser;
}

export interface DashboardMetrics {
  totalTickets: number;
  openTickets: number;
  overdueTickets: number;
  avgResponseTime: number; // Mocked for now
  ticketsByStatus: Record<TicketStatus, number>;
  ticketsByUrgency: Record<Urgency, number>;
}

export interface TicketTemplate {
  id: string;
  name: string;
  title: string;
  ticketDescription: string;
  category: string;
  urgency: Urgency;
}

export interface ProfileTemplate {
  id: string;
  name: string;
  email: string;
  isActive?: boolean
}

export interface TicketSearchParams {
  query?: string;
  status?: TicketStatus[];
  urgency?: Urgency[];
  assigneeId?: string;
  creatorId?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

export interface BulkAssignRequest {
  ticketIds: string[];
  assigneeId: string;
}

export interface BulkUpdateRequest {
  ticketIds: string[];
  status?: TicketStatus;
  urgency?: Urgency;
}
