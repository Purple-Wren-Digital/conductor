import { Dispatch, SetStateAction } from "react";
import {
  AccountInformationProps,
  AppPermissionsReviewProps,
  AssignedTicketNotificationProps,
  AssignmentUpdateType,
  CategoryAssignmentProps,
  CreatedTicketNotificationProps,
  MarketCenterAssignmentProps,
  NewCommentNotificationProps,
  NewUserInvitationProps,
  SurveyResultsProps,
  TicketSurveyProps,
  UpdatedTicketProps,
} from "@/packages/transactional/emails/types";
import { MarketCenterNotificationPreferences } from "./utils/market-centers-notifications/types";
import { AutoCloseSettings } from "./api/settings";

// CONTEXT
export type AppContext = {
  currentUser: PrismaUser | null;
  setCurrentUser: Dispatch<SetStateAction<PrismaUser | null>>;
};

// TICKETS
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
  attachmentCount?: number | null;
  attachments?: Attachment[];
  deletedAt?: Date | null;
  isActive?: boolean;
  ticketHistory: TicketHistory[];
  emailMessageId?: string | null;
  todos?: Todo[];
  surveyId?: string | null;
  survey?: Survey | null;
}

export interface Todo {
  id: string;
  title: string;
  complete: boolean;
  ticketId: string;
  createdById: string;
  updatedById?: string | null;

  createdAt: Date;
  updatedAt?: Date;

  ticket?: Ticket;
  createdBy?: { id: string; name?: string } | PrismaUser;
  updatedBy?: { id: string; name?: string } | PrismaUser;
}

export interface Attachment {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  bucketKey?: string;
  ticketId: string;
  uploadedBy: string;
  createdAt: Date;
  updatedAt: Date;
  uploader?: PrismaUser;
  uploaderName?: string;
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
  ticketCount?: number;
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
  description?: string;
  isActive: boolean;
  title: string;
  ticketDescription: string;
  categoryId?: string;
  urgency: Urgency | "MEDIUM";
  tags?: string[];
  todos?: string[];
  marketCenterId: string;
  createdAt: string;
  updatedAt: string;
  createdById: string | null;
  updatedById: string | null;
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

// SURVEY
export interface Survey {
  id: string;
  ticketId: string;
  surveyorId: string;
  assigneeId?: string | null;
  completed: boolean;
  marketCenterId: string | null;
  overallRating: number | null;
  assigneeRating: number | null;
  marketCenterRating: number | null;
  comment: string | null;
  createdAt: Date;
  updatedAt?: Date;
  ticket?: Ticket;
  surveyor?:
    | PrismaUser
    | {
        id: string;
        name: string;
        email: string;
      };
  assignee?:
    | PrismaUser
    | {
        id: string;
        name: string;
        email: string;
      };
  marketCenter?:
    | MarketCenter
    | {
        id: string;
        name: string;
      };
}

export interface SurveyResults {
  totalSurveys: number;
  overallAverageRating: number;
  assigneeAverageRating: number;
  marketCenterAverageRating: number;
}

// COMMENTS
export interface Comment {
  id: string;
  content: string;
  ticketId: string;
  userId: string;
  internal: boolean;
  source: string;
  metadata: any;
  createdAt: Date;
  updatedAt?: Date;
  user?: PrismaUser;
}

// USER
export type UserRole = "AGENT" | "STAFF" | "STAFF_LEADER" | "ADMIN";

export interface PrismaUser {
  id: string;
  clerkId: string;
  // auth0Id: string;
  email: string;
  name: string | null; // Prisma: String? === TypeScript: string | null
  role: UserRole;
  // staffLeader: boolean;

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

  _count?: {
    assignedTickets?: number;
    createdTickets?: number;
    comments?: number;
    defaultForCategories?: number;
  };
  responseSurveys?: Survey[];
  receivedSurveys?: Survey[];
  // averages?: SurveyResults;
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
  changedBy?: {
    id: string;
    name: string;
    email: string;
  };
  user?: {
    id: string;
    name: string;
    email: string;
  };
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
  settings?: MarketCenterSettings | null;
  createdAt: Date;
  updatedAt: Date;
  marketCenterHistory: MarketCenterHistory[];
  teamInvitations?: TeamInvitation[];
  ticketCategories?: TicketCategory[];

  primaryStripeCustomerId: string | null;
  primaryStripeSubscriptionId: string | null;

  users?: PrismaUser[];
  totalTickets?: number;
  totalUsers?: number;
  staffLeaderIds?: string[];
  // settingsAuditLogs?: SettingsAuditLog[];

  averages?: SurveyResults;
}

export interface MarketCenterSettings {
  notificationPreferences?: MarketCenterNotificationPreferences[];
  notificationTemplates?: NotificationTemplate[];
  ticketTemplates?: TicketTemplate[];
  marketCenter?: MarketCenter;
  autoClose?: AutoCloseSettings;

  // businessHours: BusinessHours;
  // branding: BrandingSettings;
  // holidays: string[];
  // integrations: {
  //   apiKeys: Record<string, string>;
  //   webhooks: {
  //     url: string;
  //     events: string[];
  //   }[];
  // };
  // general: {
  //   name: string;
  //   timezone: string;
  //   language: string;
  //   autoAssignment: boolean;
  // };
  // teamMembers: number;
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
  role: "AGENT" | "STAFF" | "STAFF_LEADER" | "ADMIN";
  isActive: boolean;
  createdAt: Date;
}

export interface UpdateMemberRequest {
  role: "AGENT" | "STAFF" | "STAFF_LEADER" | "ADMIN";
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
  role: "AGENT" | "STAFF" | "STAFF_LEADER" | "ADMIN";
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

export type UserSortBy = "updatedAt" | "createdAt" | "name" | "role";
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
export type NotificationTypes =
  | "App Permissions"
  | "General" // ACCOUNT, MARKETING, PRODUCT
  | "Account Information"
  // ACTIVITY ONLY
  | "Daily Summary"
  | "Weekly Report"
  | "Ticket Created"
  | "Ticket Updated"
  | "Ticket Assignment"
  | "Mentions"
  | "New Comments"
  | "Market Center Assignment"
  | "Category Assignment"
  | "Ticket Survey"
  | "Ticket Survey Results";
export interface Notification {
  id: string;
  userId: string;
  user?: PrismaUser;
  channel?: NotificationChannel;
  category: NotificationCategory;
  priority: Urgency;
  type: NotificationTypes;
  title: string;
  body: string;
  data?: NotificationData;
  read: boolean;
  deliveredAt: Date;
  createdAt: Date;
}
export interface NotificationData {
  // IN-APP OR BROWSER
  url?: string;
  ticketId?: string;
  marketCenterId?: string;
  userId?: string;
  commentId?: string;
  categoryId?: string;

  // EMAIL
  appPermissions?: AppPermissionsReviewProps;
  accountInformation?: AccountInformationProps;
  emails?: string[];
  invitation?: NewUserInvitationProps;

  // ACTIVITY: MARKET CENTER
  marketCenterAssignment?: MarketCenterAssignmentProps;
  categoryAssignment?: CategoryAssignmentProps;

  // ACTIVITY: TICKETS
  createdTicket?: CreatedTicketNotificationProps;
  updatedTicket?: UpdatedTicketProps;
  ticketAssignment?: AssignedTicketNotificationProps;
  newComment?: NewCommentNotificationProps;
  ticketSurvey?: TicketSurveyProps;
  surveyResults?: SurveyResultsProps;

  // SLA
  slaEventType?:
    | "WARNING_50"
    | "WARNING_75"
    | "BREACHED"
    | "MET"
    | "RESOLUTION_WARNING_50"
    | "RESOLUTION_WARNING_75"
    | "RESOLUTION_BREACHED";
  slaType?: "response" | "resolution";
  urgency?: Urgency;
  assigneeId?: string | null;
}

export interface PushNotificationPayload {
  token: string;
  userId: string;
  title: string;
  body: string;
}
export interface UsersToNotify {
  id: string;
  name: string;
  email: string;
  updateType: AssignmentUpdateType;
}

export interface CreateNotificationPayload {
  userId: string;
  templateName?: string;
  category: NotificationCategory;
  type: string;
  title?: string;
  body?: string;
  data?: NotificationData;
  priority?: Urgency;
}

export type NotificationContent = {
  //   getToken: GetToken;
  templateName: string;
  trigger:
    | "App Permissions"
    | "Invitation"
    | "Account Information"
    | "Ticket Created"
    | "Ticket Updated"
    | "Ticket Assignment"
    | "Mentions"
    | "New Comments"
    | "Market Center Assignment"
    | "Category Assignment"
    | "Ticket Survey"
    | "Ticket Survey Results";
  receivingUser: {
    id: string;
    name: string;
    email: string;
  };
  data?: NotificationData;
};

export type MarketCenterNotificationCallback = {
  templateName: "Market Center Assignment" | "Category Assignment";
  trigger: "Market Center Assignment" | "Category Assignment";
  receivingUser: {
    id: string;
    name: string;
    email: string;
  };
  data?: {
    marketCenterAssignment?: MarketCenterAssignmentProps;
    categoryAssignment?: CategoryAssignmentProps;
  };
};

export type TicketNotificationCallback = {
  trigger: "Ticket Created" | "Ticket Updated" | "Ticket Assignment";
  receivingUser: {
    id: string;
    name: string;
    email: string;
  };
  data?: {
    createdTicket?: CreatedTicketNotificationProps;
    updatedTicket?: UpdatedTicketProps;
    ticketAssignment?: AssignedTicketNotificationProps;
    newComment?: NewCommentNotificationProps;
  };
};

export type CommentNotificationCallback = {
  trigger: "Mentions" | "New Comments";
  receivingUser: {
    id: string;
    name: string;
    email: string;
  };
  data?: {
    newComment?: NewCommentNotificationProps;
  };
};

export type UserNotificationCallback = {
  trigger: "Invitation" | "Account Information";
  receivingUser: {
    id: string;
    name: string;
    email: string;
  };
  data?: {
    accountInformation?: AccountInformationProps;
    invitation?: NewUserInvitationProps;
  };
};

export interface MarketCenterDefaultTemplates {
  marketCenterId: string;
  notificationTemplateId: string;
  createdAt: Date;
  marketCenter?: MarketCenter;
  notificationTemplate?: NotificationTemplate;
}

export interface NotificationTemplate {
  id: string;
  templateName: string;
  templateDescription: string;
  category: NotificationCategory;
  channel: NotificationChannel;
  type: string;
  subject: string;
  body: string;
  isDefault: boolean;
  createdAt: Date;
  variables: any;
  isActive: boolean;
  marketCenterId: string | null;
  marketCenter?: MarketCenter;
  marketCenterDefaultTemplates?: MarketCenterDefaultTemplates[];
}

export interface NotificationTemplateFormData {
  subject: string;
  body: string;
  marketCenters: {
    name: string;
    id: string;
    templateId: string;
    isActive: boolean;
  }[];
}
