import {
  AccountInformationProps,
  AppPermissionsReviewProps,
  AssignedTicketNotificationProps,
  CategoryAssignmentProps,
  CreatedTicketNotificationProps,
  MarketCenterAssignmentProps,
  NewCommentNotificationProps,
  NewUserInvitationProps,
  UpdatedTicketProps,
} from "@/emails/types";
import type { NotificationCategory, NotificationChannel } from "../types";

type VariablePlaceholders<T> = {
  [K in keyof T]: T[K] extends object
    ? VariablePlaceholders<T[K]> // recursive for nested structures
    : `{{${Extract<K, string>}}}`;
};

export const NotificationTemplateVariables = {
  // 🏢 MARKET CENTERS
  MarketCenterAssignmentProps: {
    userUpdate: "{{userUpdate}}",
    marketCenterName: "{{marketCenterName}}",
    marketCenterId: "{{marketCenterId}}",
    userName: "{{userName}}",
    editorName: "{{editorName}}",
    editorEmail: "{{editorEmail}}",
  } satisfies VariablePlaceholders<MarketCenterAssignmentProps>,
  CategoryAssignmentProps: {
    userUpdate: "{{userUpdate}}",
    categoryName: "{{categoryName}}",
    categoryDescription: "{{categoryDescription}}",
    marketCenterName: "{{marketCenterName}}",
    marketCenterId: "{{marketCenterId}}",
    userName: "{{userName}}",
    editorName: "{{editorName}}",
    editorEmail: "{{editorEmail}}",
  } satisfies VariablePlaceholders<CategoryAssignmentProps>,

  // 🎫 TICKETS
  CreatedTicketNotificationProps: {
    ticketNumber: "{{ticketNumber}}",
    ticketTitle: "{{ticketTitle}}",
    creatorName: "{{creatorName}}",
    creatorId: "{{creatorId}}",
    createdOn: "{{createdOn}}",
    dueDate: "{{dueDate}}",
    assigneeId: "{{assigneeId}}",
    assigneeName: "{{assigneeName}}",
  } satisfies VariablePlaceholders<CreatedTicketNotificationProps>,
  AssignedTicketNotificationProps: {
    ticketNumber: "{{ticketNumber}}",
    ticketTitle: "{{ticketTitle}}",
    createdOn: "{{createdOn}}",
    updatedOn: "{{updatedOn}}",
    editedByName: "{{editedByName}}",
    editedById: "{{editedById}}",
    updateType: "{{updateType}}",
    currentAssignment: "{{currentAssignment}}", // rendered as list
    previousAssignment: "{{previousAssignment}}", // rendered as list
  } satisfies VariablePlaceholders<AssignedTicketNotificationProps>,
  UpdatedTicketProps: {
    ticketNumber: "{{ticketNumber}}",
    ticketTitle: "{{ticketTitle}}",
    createdOn: "{{createdOn}}",
    updatedOn: "{{updatedOn}}",
    editedByName: "{{editedByName}}",
    editedById: "{{editedById}}",
    changedDetails: "{{changedDetails}}", // rendered as list
  } satisfies VariablePlaceholders<UpdatedTicketProps>,
  // 💬 COMMENTS
  NewCommentNotificationProps: {
    ticketNumber: "{{ticketNumber}}",
    ticketTitle: "{{ticketTitle}}",
    createdOn: "{{createdOn}}",
    commenterName: "{{commenterName}}",
    commenterId: "{{commenterId}}",
    comment: "{{comment}}",
    isInternal: "{{isInternal}}",
    assignee: "{{assignee}}",
  } satisfies VariablePlaceholders<NewCommentNotificationProps>,
  // 👤 USERS
  //   AppPermissionsReviewProps: {
  //     email: "{{email}}",
  //     name: "{{name}}",
  //   } satisfies VariablePlaceholders<AppPermissionsReviewProps>,
  // AccountInformationProps: {
  //   changedByName: "{{changedByName}}",
  //   changedByEmail: "{{changedByEmail}}",
  //   updates: "{{updates}}", // rendered as list
  // } satisfies VariablePlaceholders<AccountInformationProps>,
  // NewUserInvitationProps: {
  //   newUserName: "{{newUserName}}",
  //   newUserEmail: "{{newUserEmail}}",
  //   newUserRole: "{{newUserRole}}",
  //   newUserMarketCenter: "{{newUserMarketCenter}}",
  //   inviterName: "{{inviterName}}",
  //   inviterEmail: "{{inviterEmail}}",
  // } satisfies VariablePlaceholders<NewUserInvitationProps>,
} as const;

export const notificationTemplatesDefault = [
  {
    templateName: "Market Center User Added",
    templateDescription: "Sent when a user is added to a Market Center",
    category: "ACTIVITY" as NotificationCategory,
    channel: "IN_APP" as NotificationChannel,
    type: "Market Center Assignment",
    subject: "Market Center Assignment",
    body: `{{editorName}} added you to {{marketCenterName}}`,
    isDefault: true,
    variables: NotificationTemplateVariables.MarketCenterAssignmentProps,
  },
  {
    templateName: "Market Center User Removed",
    templateDescription: "Sent when a user is removed from a Market Center",
    category: "ACTIVITY" as NotificationCategory,
    channel: "IN_APP" as NotificationChannel,
    type: "Market Center Assignment",
    subject: "Market Center Assignment",
    body: `{{editorName}} removed you from {{marketCenterName}}`,
    isDefault: true,
    variables: NotificationTemplateVariables.MarketCenterAssignmentProps,
  },
  {
    templateName: "Category Assignment - Added",
    templateDescription: "Sent when a user is added to a Ticket Category",
    category: "ACTIVITY" as NotificationCategory,
    channel: "IN_APP" as NotificationChannel,
    type: "Category Assignment",
    subject: "Category Assignment",
    body: `You will now be automatically assigned to tickets created with {{categoryName}}`,
    isDefault: true,
    variables: NotificationTemplateVariables.CategoryAssignmentProps,
  },
  {
    templateName: "Category Assignment - Removed",
    templateDescription: "Sent when a user is removed from a Ticket Category",
    category: "ACTIVITY" as NotificationCategory,
    channel: "IN_APP" as NotificationChannel,
    type: "Category Assignment",
    subject: "Category Assignment",
    body: `You will no longer be automatically assigned to tickets created with {{categoryName}}`,
    isDefault: true,
    variables: NotificationTemplateVariables.CategoryAssignmentProps,
  },
  {
    templateName: "Ticket Created",
    templateDescription: "Sent when a user creates a Ticket",
    category: "ACTIVITY" as NotificationCategory,
    channel: "IN_APP" as NotificationChannel,
    type: "Ticket Created",
    subject: "Ticket Created",
    body: `{{ticketTitle}} was created}`,
    isDefault: true,
    variables: NotificationTemplateVariables.CreatedTicketNotificationProps,
  },
  {
    templateName: "Ticket Assignment - Added",
    templateDescription: "Sent when a user is assigned to a Ticket",
    category: "ACTIVITY" as NotificationCategory,
    channel: "IN_APP" as NotificationChannel,
    type: "Ticket Assignment",
    subject: "Ticket Assignment",
    body: `{{ticketTitle}} is now in your queue`,
    isDefault: true,
    variables: NotificationTemplateVariables.AssignedTicketNotificationProps,
  },
  {
    templateName: "Ticket Assignment - Removed",
    templateDescription: "Sent when a user is removed from a Ticket",
    category: "ACTIVITY" as NotificationCategory,
    channel: "IN_APP" as NotificationChannel,
    type: "Ticket Assignment",
    subject: "Ticket Assignment",
    body: `{{ticketTitle}} is no longer in your queue`,
    isDefault: true,
    variables: NotificationTemplateVariables.AssignedTicketNotificationProps,
  },
  {
    templateName: "Ticket Updated",
    templateDescription: "Sent when a user updates a Ticket",
    category: "ACTIVITY" as NotificationCategory,
    channel: "IN_APP" as NotificationChannel,
    type: "Ticket Updated",
    subject: "Ticket Updated",
    body: `The following for "{{ticketTitle}}" has been updated: {{changedDetails}}`,
    isDefault: true,
    variables: NotificationTemplateVariables.UpdatedTicketProps,
  },
  {
    templateName: "New Comments on Ticket",
    templateDescription: "Sent when a new comment is added to a Ticket",
    category: "ACTIVITY" as NotificationCategory,
    channel: "IN_APP" as NotificationChannel,
    type: "New Comments",
    subject: "New Comment for {{ticketTitle}}",
    body: `{{commenterName}} added a new comment to "{{ticketTitle}}": {{comment}}`,
    isDefault: true,
    variables: NotificationTemplateVariables.NewCommentNotificationProps,
  },
];
