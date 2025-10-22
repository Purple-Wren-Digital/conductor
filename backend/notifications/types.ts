import { Urgency } from "../ticket/types";
import { User } from "../user/types";

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
  user?: User;

  channel?: NotificationChannel;
  category: NotificationCategory;
  priority?: Urgency;
  type: string;
  title: string;
  body: string;
  data?: NotificationData; // Record<string, any>
  read: boolean;
  deliveredAt: Date | null;
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