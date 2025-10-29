import {
  CreatedTicketNotificationProps,
  EditedTicketNotificationProps,
  MarketCenterUserUpdateProps,
  NewCommentNotificationProps,
  NewUserInvitationProps,
  QuickEditTicketNotificationProps,
  ReassignedTicketNotificationProps,
} from "@/emails/types";
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

export type NotificationTrigger =
  // ACCOUNT
  | "Invitation"
  | "Welcome"
  | "PasswordChange"
  | "UsernameChange"
  | "EmailChange"
  // ACTIVITY
  | "TicketCreated"
  | "TicketUpdated"
  | "TicketAssignment"
  | "Mentions"
  | "NewComments"
  | "MarketCenterAssignment"
  | "CategoryAssignment"
  | "DailySummary"
  | "WeeklySummary"
  // MARKETING/PRODUCT
  | "MarketingNewsletter"
  | "ProductUpdate";

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

  trigger?: NotificationTrigger;
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
  emails?: string[];
  invitation?: NewUserInvitationProps;
  marketCenterAssignment?: MarketCenterUserUpdateProps;
  createdTicket?: CreatedTicketNotificationProps;
  editedTicket?: EditedTicketNotificationProps;
  reassignedTicket?: ReassignedTicketNotificationProps;
  quickEditTicket?: QuickEditTicketNotificationProps;
  newComment?: NewCommentNotificationProps;
}

export interface PushNotificationPayload {
  token: string;
  userId: string;
  title: string;
  body: string;
}
