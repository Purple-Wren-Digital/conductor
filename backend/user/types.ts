import { MarketCenter, TicketCategory } from "../marketCenters/types";
import { Urgency, TicketHistory } from "../ticket/types";

export type UserRole = "AGENT" | "STAFF" | "ADMIN";

export type NotificationChannel = "EMAIL" | "PUSH" | "IN_APP" | "TEXT";
export type NotificationFrequency = "INSTANT" | "DAILY" | "WEEKLY";
export type NotificationCategory =
  | "ACCOUNT"
  | "ACTIVITY"
  | "MARKETING"
  | "PRODUCT";

export interface User {
  id: string;
  email: string;
  name: string | null; // Prisma: name String?  => TypeScript: string | null
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
  ticketCategory?: TicketCategory[];
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

export interface Notification {
  id: string;

  userId: string;
  user: User;

  channel?: NotificationChannel;
  category: NotificationCategory;
  priority: Urgency;
  type: string; // e.g. "ticket_updated", "comment_reply", "weekly_summary"
  title: string;
  body: string;
  data?: {
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

export interface UserSettings {
  id: string;
  userId: string;
  notificationPreferences: NotificationPreferences;
  createdAt: Date;
  updatedAt: Date;
  user: User;
}

export interface NotificationPreferences {
  id: string;
  frequency: NotificationFrequency;
  type: string; // e.g. "ticket_updated", "comment_reply", "weekly_summary"
  email: boolean;
  push: boolean;
  inApp: boolean;
  text: boolean;
  userSettingsId: string;
  userSettings?: UserSettings;
}
