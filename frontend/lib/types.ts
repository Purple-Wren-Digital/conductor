import { Dispatch, SetStateAction } from "react";

export type AppContext = {
  currentUser: PrismaUser | null;
  setCurrentUser: Dispatch<SetStateAction<PrismaUser | null>>;
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
  creatorId?: string;
  assigneeId?: string | null;
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
  marketCenterId: string | null;
  marketCenter?: {
    id: string;
    name: string;
  } | null;
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
  isActive?: boolean;
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

export interface MarketCenter {
  id: string;
  name: string;
  settings?: {} | null;
  createdAt: Date;
  updatedAt: Date;
  settingsAuditLogs?: SettingsAuditLog[];
  teamInvitations?: TeamInvitation[];
  ticketCategories?: TicketCategory[];
  users?: PrismaUser[];
}

export interface SettingsAuditLog {
  id: string;
  marketCenterId: string;
  userId: string;
  action: string;
  section: string;
  previousValue?: {};
  newValue?: {};
  createdAt: Date;
  marketCenter: MarketCenter;
  user: PrismaUser;
}

export type InvitationStatus = "PENDING" | "ACCEPTED" | "EXPIRED" | "CANCELLED";

export interface TeamInvitation {
  id: string;
  email: string;
  role: UserRole;
  status: InvitationStatus;
  marketCenterId?: string;
  invitedBy?: string;
  token: string;
  expiresAt: Date;
  acceptedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  marketCenter?: MarketCenter;
}

export interface TicketCategory {
  id: string;
  name: string;
  description?: string;
  marketCenterId: string;
  defaultAssigneeId?: string;
  createdAt: Date;
  updatedAt: Date;
  defaultAssignee?: PrismaUser;
  marketCenter: MarketCenter;
}
