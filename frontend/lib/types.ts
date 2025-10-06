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
  ticketHistory?: TicketHistory[];
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
  ticketHistory?: TicketHistory[];
  userHistory?: UserHistory[];
  otherUsersChanges?: UserHistory[];
}

export interface TicketHistory {
  id: string;
  ticketId: string;
  field: string;
  previousValue: string;
  newValue: string;
  snapshot?: JSON; // Ticket as it was in this moment
  changedAt: Date;
  changedById: string;
  changedBy?: PrismaUser;
}

export interface UserHistory {
  id: string;
  userId: string;
  marketCenterId: string;
  field: string;
  previousValue: string;
  newValue: string;
  snapshot?: JSON; // User as they were in this moment
  changedAt: Date;
  changedById: string;
  changedBy?: PrismaUser;
  user?: PrismaUser;
}

export interface UserEditFormData {
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  marketCenterId?: string;
}

export interface UserWithStats extends PrismaUser {
  ticketsAssigned?: number;
  ticketsCreated?: number;
  lastActive?: Date;
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
  // settingsAuditLogs?: SettingsAuditLog[];
  teamInvitations?: TeamInvitation[];
  ticketCategories?: TicketCategory[];
  users?: PrismaUser[];
}

export interface MarketCenterHistory {
  id: string;
  marketCenterId: string;
  action: string; // create, add, remove, update, delete
  field: string; // users, name, ticketCategories
  previousValue: string;
  newValue: string;
  changedAt: Date;
  changedById: string;
  marketCenter?: MarketCenter;
  changedBy?: PrismaUser;
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

// MARKET CENTERS
export type MarketCenterForm = {
  name: string;
  selectedUsers: PrismaUser[];
  ticketCategories?: any[]
};

export interface BusinessHours {
  monday: { start: string; end: string; isOpen: boolean };
  tuesday: { start: string; end: string; isOpen: boolean };
  wednesday: { start: string; end: string; isOpen: boolean };
  thursday: { start: string; end: string; isOpen: boolean };
  friday: { start: string; end: string; isOpen: boolean };
  saturday: { start: string; end: string; isOpen: boolean };
  sunday: { start: string; end: string; isOpen: boolean };
}

export interface BrandingSettings {
  primaryColor: string;
  logoUrl?: string;
  companyName?: string;
}

export interface MarketCenterSettings {
  businessHours: BusinessHours;
  branding: BrandingSettings;
  holidays: string[];
  integrations: {
    apiKeys: Record<string, string>;
    webhooks: {
      url: string;
      events: string[];
    }[];
  };
  general: {
    timezone: string;
    language: string;
    autoAssignment: boolean;
  };
  teamMembers: PrismaUser[];
}

export interface SettingsUpdateRequest {
  settings: Partial<MarketCenterSettings>;
}

export interface SettingsAuditLogEntry {
  id: string;
  marketCenterId: string;
  userId: string;
  action: string;
  section: string;
  previousValue: any;
  newValue: any;
  createdAt: Date;
}

export interface TeamInviteRequest {
  email: string;
  role: "AGENT" | "STAFF" | "ADMIN";
}

export interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: "AGENT" | "STAFF" | "ADMIN";
  isActive: boolean;
  createdAt: Date;
}

export interface UpdateMemberRequest {
  role: "AGENT" | "STAFF" | "ADMIN";
}

// FILTERS
export type OrderBy = "asc" | "desc";

export type UserSortBy = "updatedAt" | "createdAt" | "name";
export type UsersResponse = { users: PrismaUser[] };

export type TicketSortBy = "updatedAt" | "createdAt" | "urgency" | "status";
export type TicketWithUpdatedAt = Ticket & { updatedAt?: string | Date };
export type TicketsResponse = { tickets: TicketWithUpdatedAt[]; total: number };
