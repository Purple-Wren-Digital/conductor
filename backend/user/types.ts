import {
  MarketCenter,
  MarketCenterHistory,
  TicketCategory,
} from "../marketCenters/types";
import { Comment, Urgency, TicketHistory, Ticket } from "../ticket/types";

export type UserRole = "AGENT" | "STAFF" | "ADMIN";

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

export interface User {
  id: string;
  auth0Id: string;
  email: string;
  name: string | null; // Prisma: String? === TypeScript: string | null
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  comments?: Comment[];

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
  changedBy?: User;
  user?: User;
}

export interface UserSettings {
  id: string;
  userId: string;
  notificationPreferences?: NotificationPreferences[];
  createdAt: Date;
  updatedAt: Date;
  user?: User;
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

export interface Notification {
  id: string;

  userId: string;
  user?: User;

  channel?: NotificationChannel;
  category: NotificationCategory;
  priority: Urgency;
  type: string;
  title: string;
  body: string;
  data?: {
    url?: string;
    ticketId?: string;
    marketCenterId?: string;
    userId?: string;
    commentId?: string;
    categoryId?: string;
  };

  read: boolean;
  deliveredAt: Date;
  createdAt: Date;
}
