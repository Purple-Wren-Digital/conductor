import {
  AccountInformationProps,
  AppPermissionsReviewProps,
  CategoryAssignmentProps,
  CreatedTicketNotificationProps,
  UpdatedTicketProps,
  MarketCenterAssignmentProps,
  NewCommentNotificationProps,
  NewUserInvitationProps,
  QuickEditTicketNotificationProps,
  AssignedTicketNotificationProps,
  AssignmentUpdateType,
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
  | "Category Assignment";

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
  data?: NotificationData;
  read: boolean;
  deliveredAt: Date | null;
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
  quickEditTicket?: QuickEditTicketNotificationProps;
  newComment?: NewCommentNotificationProps;
}

export interface UsersToNotify {
  id: string;
  name: string;
  email: string;
  updateType: AssignmentUpdateType;
}
