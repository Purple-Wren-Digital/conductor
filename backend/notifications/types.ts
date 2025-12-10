import {
  AccountInformationProps,
  AppPermissionsReviewProps,
  CategoryAssignmentProps,
  CreatedTicketNotificationProps,
  UpdatedTicketProps,
  MarketCenterAssignmentProps,
  NewCommentNotificationProps,
  NewUserInvitationProps,
  AssignedTicketNotificationProps,
  AssignmentUpdateType,
  TicketSurveyProps,
  SurveyResultsProps,
} from "@/emails/types";
import { Urgency } from "../ticket/types";
import { User } from "../user/types";
import { MarketCenter } from "../marketCenters/types";

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
  newComment?: NewCommentNotificationProps;
  ticketSurvey?: TicketSurveyProps;
  surveyResults?: SurveyResultsProps;

  // SLA
  slaEventType?: "WARNING_50" | "WARNING_75" | "BREACHED" | "MET";
  urgency?: Urgency;
  assigneeId?: string | null;
}

export interface UsersToNotify {
  id: string;
  name: string;
  email: string;
  updateType: AssignmentUpdateType;
}

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

// export interface NotificationTemplateFormData {
//   subject: string;
//   body: string;
//   isActive: boolean;
// }

export interface PushNotificationPayload {
  token: string;
  userId: string;
  title: string;
  body: string;
}
