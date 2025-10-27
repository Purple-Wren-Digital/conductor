import { Dispatch, SetStateAction } from "react";

// CONTEXT
export type AppContext = {
  currentUser: PrismaUser | null;
  setCurrentUser: Dispatch<SetStateAction<PrismaUser | null>>;
};

// TICKET
export type TicketStatus =
  | "DRAFT"
  | "CREATED"
  | "ASSIGNED"
  | "UNASSIGNED"
  | "AWAITING_RESPONSE"
  | "IN_PROGRESS"
  | "RESOLVED";
export type Urgency = "HIGH" | "MEDIUM" | "LOW";

export interface Ticket {
  id: string;
  title: string | null; // Prisma: title String?  => allow null (or keep string if you always normalize)
  description: string | null; // Prisma: description String? => allow null
  status: TicketStatus;
  urgency: Urgency;
  categoryId?: string | null;
  creatorId?: string;
  assigneeId?: string | null;
  dueDate: Date | null;
  resolvedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  creator?: PrismaUser;
  assignee?: PrismaUser | null;
  category?: TicketCategory | null;
  commentCount?: number | null;
  deletedAt?: Date | null;
  isActive?: boolean;
  ticketHistory: TicketHistory[];
}
export interface TicketCategory {
  id: string;
  name: string;
  description: string | null;
  marketCenterId: string;
  defaultAssigneeId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  defaultAssignee?: PrismaUser | null;
  marketCenter?: MarketCenter;
}
export interface TicketHistory {
  id: string;
  ticketId: string;
  action: string;
  field: string | null;
  previousValue: string | null;
  newValue: string | null;
  snapshot?: {}; // Ticket as it was in this moment
  changedAt: Date;
  changedById: string;
  changedBy?: PrismaUser;
  ticket?: Ticket;
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

export interface TicketTemplate {
  id: string;
  name: string;
  title: string;
  ticketDescription: string;
  category: string;
  urgency: Urgency;
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

// COMMENTS

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

// USER
export type UserRole = "AGENT" | "STAFF" | "ADMIN";

export interface PrismaUser {
  id: string;
  clerkId: string;
  // auth0Id: string;
  email: string;
  name: string | null; // Prisma: String? === TypeScript: string | null
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  comments: Comment[];

  defaultForCategories?: TicketCategory[];
  assignedTickets?: Ticket[];
  createdTickets?: Ticket[];

  marketCenterId: string | null;
  marketCenter?: MarketCenter;

  ticketHistory?: TicketHistory[];
  userHistory?: UserHistory[];
  otherUsersChanges?: UserHistory[];
  marketCenterHistory?: MarketCenterHistory[];

  userSettings?: UserSettings;

  notifications?: Notification[];
}
export interface UserHistory {
  id: string;
  userId: string;
  marketCenterId: string;
  action: string;
  field: string | null;
  previousValue: string | null;
  newValue: string | null;
  snapshot?: {}; // User as they were in this moment
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

// USER SETTINGS

export interface UserSettings {
  id: string;
  userId: string;
  notificationPreferences: NotificationPreferences[];
  createdAt: Date;
  updatedAt: Date;
  user: PrismaUser;
}
export interface NotificationPreferences {
  id: string;
  frequency: NotificationFrequency;
  category: NotificationCategory;
  type: string;
  email: boolean;
  push: boolean;
  inApp: boolean;
  sms: boolean;
  userSettingsId: string;
  userSettings?: UserSettings;
}

export interface ProfileTemplate {
  id: string;
  name: string;
  email: string;
  isActive?: boolean;
}

// DASHBOARD
export interface DashboardMetrics {
  totalTickets: number;
  openTickets: number;
  overdueTickets: number;
  avgResponseTime: number; // Mocked for now
  ticketsByStatus: Record<TicketStatus, number>;
  ticketsByUrgency: Record<Urgency, number>;
}

// MARKET CENTER
export interface MarketCenter {
  id: string;
  name: string;
  settings?: {} | null;
  createdAt: Date;
  updatedAt: Date;
  marketCenterHistory: MarketCenterHistory[];
  teamInvitations?: TeamInvitation[];
  ticketCategories?: TicketCategory[];
  users?: PrismaUser[];
  // settingsAuditLogs?: SettingsAuditLog[];
}

export interface MarketCenterHistory {
  id: string;
  marketCenterId: string;
  action: string;
  field: string | null;
  previousValue: string | null;
  newValue: string | null;
  changedAt: Date;
  changedById: string;
  marketCenter?: MarketCenter;
  changedBy?: PrismaUser;
}

export type MarketCenterForm = {
  name: string;
  selectedUsers: PrismaUser[];
  ticketCategories?: any[];
};

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

// MARKET CENTER SETTINGS
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

export interface SettingsUpdateRequest {
  settings: Partial<MarketCenterSettings>;
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

// USER INVITATIONS
export type InvitationStatus = "PENDING" | "ACCEPTED" | "EXPIRED" | "CANCELLED";
export interface TeamInviteRequest {
  email: string;
  role: "AGENT" | "STAFF" | "ADMIN";
}
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

// SEARCH FILTERS
export type OrderBy = "asc" | "desc";

export type UserSortBy = "updatedAt" | "createdAt" | "name";
export type UsersResponse = { users: PrismaUser[]; total: number };

export type TicketSortBy = "updatedAt" | "createdAt" | "urgency" | "status";
export type TicketWithUpdatedAt = Ticket & { updatedAt?: string | Date };
export type TicketsResponse = { tickets: TicketWithUpdatedAt[]; total: number };

// FORM
export type FormErrors = Record<string, string>;

// NOTIFICATIONS
export type NotificationChannel = "EMAIL" | "PUSH" | "IN_APP" | "SMS";
export type NotificationFrequency =
  | "NONE"
  | "INSTANT"
  | "DAILY"
  | "WEEKLY"
  | "MONTHLY"
  | "QUARTERLY"
  | "ANNUALLY";
export type NotificationCategory =
  | "ACCOUNT"
  | "ACTIVITY"
  | "MARKETING"
  | "PERMISSIONS"
  | "PRODUCT";
export interface Notification {
  id: string;
  userId: string;
  user?: PrismaUser;
  channel?: NotificationChannel;
  category: NotificationCategory;
  priority: Urgency;
  type: string;
  title: string;
  body: string;
  data?: NotificationData;
  read: boolean;
  deliveredAt: Date;
  createdAt: Date;
}
export interface NotificationData {
  url?: string;
  ticketId?: string;
  marketCenterId?: string;
  userId?: string;
  commentId?: string;
  categoryId?: string;
  emails?: string[];
  emailTemplate?: string;
}

export interface PushNotificationPayload {
  token: string;
  userId: string;
  title: string;
  body: string;
}
