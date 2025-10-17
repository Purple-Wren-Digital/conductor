import { User, Urgency } from "../ticket/types";

export type NotificationChannel = "EMAIL" | "PUSH" | "IN_APP" | "TEXT";
export type NotificationFrequency = "INSTANT" | "DAILY" | "WEEKLY";
export type NotificationCategory =
  | "ACCOUNT"
  | "ACTIVITY"
  | "MARKETING"
  | "PRODUCT";

export interface Notification {
  id: string;

  userId: string;
  user: User;

  channel?: NotificationChannel;
  category: NotificationCategory;
  priority: string;
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
