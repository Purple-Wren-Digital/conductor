import {
  AssignedTicketNotificationProps,
  CategoryAssignmentProps,
  CreatedTicketNotificationProps,
  MarketCenterAssignmentProps,
  NewCommentNotificationProps,
  SurveyResultsProps,
  TicketSurveyProps,
  UpdatedTicketProps,
} from "@/emails/types";
import type { NotificationCategory, NotificationChannel } from "../types";
import {
  CreateNotificationPayload,
  NotificationContent,
  NotificationContext,
  NotificationTemplate,
} from "../types";
import { ActivityUpdates, NewUserInvitationProps } from "@/emails/types";

// type VariablePlaceholders<T> = {
//   [K in keyof T]: T[K] extends object
//     ? VariablePlaceholders<T[K]> // recursive for nested structures
//     : `${Extract<K, string>}`;
// };

type VariablePlaceholders<T> = {
  [K in keyof T]: string; // <-- allow any string value
};

export const NotificationTemplateVariables = {
  MarketCenterAssignmentProps: {
    userUpdate: "{{user_update}}",
    marketCenterName: "{{market_center_name}}",
    marketCenterId: "{{market_center_id}}",
    userName: "{{user_name}}",
    editorName: "{{editor_name}}",
    editorEmail: "{{editor_email}}",
  } satisfies VariablePlaceholders<MarketCenterAssignmentProps>,
  CategoryAssignmentProps: {
    userUpdate: "{{user_update}}",
    categoryName: "{{category_name}}",
    categoryDescription: "{{category_description}}",
    marketCenterName: "{{market_center_name}}",
    marketCenterId: "{{market_center_id}}",
    userName: "{{user_name}}",
    editorName: "{{editor_name}}",
    editorEmail: "{{editor_email}}",
  } satisfies VariablePlaceholders<CategoryAssignmentProps>,
  CreatedTicketNotificationProps: {
    ticketNumber: "{{ticket_number}}",
    ticketTitle: "{{ticket_title}}",
    creatorName: "{{creator_name}}",
    creatorId: "{{creator_id}}",
    createdOn: "{{created_on}}",
    dueDate: "{{due_date}}",
    assigneeId: "{{assignee_id}}",
    assigneeName: "{{assignee_name}}",
  } satisfies VariablePlaceholders<CreatedTicketNotificationProps>,
  AssignedTicketNotificationProps: {
    ticketNumber: "{{ticket_number}}",
    ticketTitle: "{{ticket_title}}",
    createdOn: "{{created_on}}",
    updatedOn: "{{updated_on}}",
    editorName: "{{editor_name}}",
    editorId: "{{editor_id}}",
    updateType: "{{update_type}}",
    currentAssignment: "{{current_assignment}}", // rendered as list
    previousAssignment: "{{previous_assignment}}", // rendered as list
  } satisfies VariablePlaceholders<AssignedTicketNotificationProps>,
  UpdatedTicketProps: {
    ticketNumber: "{{ticket_number}}",
    ticketTitle: "{{ticket_title}}",
    createdOn: "{{created_on}}",
    updatedOn: "{{updated_on}}",
    editorName: "{{editor_name}}",
    editorId: "{{editor_id}}",
    changedDetails: "{{changed_details}}", // rendered as list
  } satisfies VariablePlaceholders<UpdatedTicketProps>,
  NewCommentNotificationProps: {
    ticketNumber: "{{ticket_number}}",
    ticketTitle: "{{ticket_title}}",
    createdOn: "{{created_on}}",
    commenterName: "{{commenter_name}}",
    commenterId: "{{commenter_id}}",
    comment: "{{comment}}",
    isInternal: "{{is_internal}}",
  } satisfies VariablePlaceholders<NewCommentNotificationProps>,

  TicketSurveyProps: {
    ticketNumber: "{{ticket_number}}",
    ticketTitle: "{{ticket_title}}",
    surveyorName: "{{surveyor_name}}",
  } satisfies VariablePlaceholders<TicketSurveyProps>,
  SurveyResultsProps: {
    ticketNumber: "{{ticket_number}}",
    ticketTitle: "{{ticket_title}}",
    staffName: "{{staff_name}}",
  } satisfies VariablePlaceholders<SurveyResultsProps>,
} as const;

export const notificationTemplatesDefault = [
  {
    templateName: "Market Center User Added",
    templateDescription: "Sent when a user is added to a Market Center",
    category: "ACTIVITY" as NotificationCategory,
    channel: "IN_APP" as NotificationChannel,
    type: "Market Center Assignment",
    subject: "Market Center Assignment",
    body: `{{editor_name}} added you to {{market_center_name}}`,
    variables: NotificationTemplateVariables.MarketCenterAssignmentProps,
    isDefault: true,
    isActive: true,
  },
  {
    templateName: "Market Center User Removed",
    templateDescription: "Sent when a user is removed from a Market Center",
    category: "ACTIVITY" as NotificationCategory,
    channel: "IN_APP" as NotificationChannel,
    type: "Market Center Assignment",
    subject: "Market Center Assignment",
    body: `{{editor_name}} removed you from {{market_center_name}}`,
    variables: NotificationTemplateVariables.MarketCenterAssignmentProps,
    isDefault: true,
    isActive: true,
  },
  {
    templateName: "Category Assignment - Added",
    templateDescription: "Sent when a user is added to a Ticket Category",
    category: "ACTIVITY" as NotificationCategory,
    channel: "IN_APP" as NotificationChannel,
    type: "Category Assignment",
    subject: "Category Assignment",
    body: `You will now be automatically assigned to tickets created with {{category_name}}`,
    variables: NotificationTemplateVariables.CategoryAssignmentProps,
    isDefault: true,
    isActive: true,
  },
  {
    templateName: "Category Assignment - Removed",
    templateDescription: "Sent when a user is removed from a Ticket Category",
    category: "ACTIVITY" as NotificationCategory,
    channel: "IN_APP" as NotificationChannel,
    type: "Category Assignment",
    subject: "Category Assignment",
    body: `You will no longer be automatically assigned to tickets created with {{category_name}}`,
    variables: NotificationTemplateVariables.CategoryAssignmentProps,
    isDefault: true,
    isActive: true,
  },
  {
    templateName: "Ticket Created",
    templateDescription: "Sent when a user creates a Ticket",
    category: "ACTIVITY" as NotificationCategory,
    channel: "IN_APP" as NotificationChannel,
    type: "Ticket Created",
    subject: "Ticket Created",
    body: `{{ticket_title}} was created by {{creator_name}}`,
    variables: NotificationTemplateVariables.CreatedTicketNotificationProps,
    isDefault: true,
    isActive: true,
  },
  {
    templateName: "Ticket Assignment - Added",
    templateDescription: "Sent when a user is assigned to a Ticket",
    category: "ACTIVITY" as NotificationCategory,
    channel: "IN_APP" as NotificationChannel,
    type: "Ticket Assignment",
    subject: "Ticket Assignment",
    body: `{{ticket_title}} is now in your queue`,
    variables: NotificationTemplateVariables.AssignedTicketNotificationProps,
    isDefault: true,
    isActive: true,
  },
  {
    templateName: "Ticket Assignment - Removed",
    templateDescription: "Sent when a user is removed from a Ticket",
    category: "ACTIVITY" as NotificationCategory,
    channel: "IN_APP" as NotificationChannel,
    type: "Ticket Assignment",
    subject: "Ticket Assignment",
    body: `{{ticket_title}} is no longer in your queue`,
    variables: NotificationTemplateVariables.AssignedTicketNotificationProps,
    isDefault: true,
    isActive: true,
  },
  {
    templateName: "Ticket Updated",
    templateDescription: "Sent when a user updates a Ticket",
    category: "ACTIVITY" as NotificationCategory,
    channel: "IN_APP" as NotificationChannel,
    type: "Ticket Updated",
    subject: "Ticket Updated",
    body: `The following for "{{ticket_title}}" has been updated: {{changed_details}}`,
    variables: NotificationTemplateVariables.UpdatedTicketProps,
    isDefault: true,
    isActive: true,
  },
  {
    templateName: "New Comments on Ticket",
    templateDescription: "Sent when a new comment is added to a Ticket",
    category: "ACTIVITY" as NotificationCategory,
    channel: "IN_APP" as NotificationChannel,
    type: "New Comments",
    subject: "New Comment for {{ticket_title}}",
    body: `{{commenter_name}} added a new comment to "{{ticket_title}}": "{{comment}}"`,
    variables: NotificationTemplateVariables.NewCommentNotificationProps,
    isDefault: true,
    isActive: true,
  },
  {
    templateName: "Ticket Survey",
    templateDescription: "Sent to the ticket's creator when marked as resolved",
    category: "ACTIVITY" as NotificationCategory,
    channel: "IN_APP" as NotificationChannel,
    type: "Ticket Survey",
    subject: "Survey for {{ticket_title}}",
    body: "Please take a moment to provide feedback about your experience",
    variables: NotificationTemplateVariables.TicketSurveyProps,
    isDefault: true,
    isActive: true,
  },
  {
    templateName: "Ticket Survey Results",
    templateDescription:
      "Sent to the ticket's assignee and market center manager(s) when new survey results are available",
    category: "ACTIVITY" as NotificationCategory,
    channel: "IN_APP" as NotificationChannel,
    type: "Ticket Survey Results",
    subject: "Survey Completed for {{ticket_title}}",
    body: "You may now view the ratings and comments provided by the ticket's creator",
    variables: NotificationTemplateVariables.SurveyResultsProps,
    isDefault: true,
    isActive: true,
  },
];

function toSnakeCase(obj: Record<string, any>) {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [
      key.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`),
      value,
    ])
  );
}
function extractTemplateVariables(variables: Record<string, string>): string[] {
  return Object.values(variables).map((v) => v.replace(/[{}]/g, ""));
}

//  START FORMATTING HELPERS
export function renderTemplate({
  templateContent,
  variables,
  data,
}: {
  templateContent: string; // e.g., "editor-Name added you to marketCenterName"
  variables: string[];
  data: Record<string, string | number | undefined>;
}): string {
  let result = templateContent;

  for (const key of variables) {
    const value = data[key];
    if (value === undefined) continue;

    // Match TipTap {editor_name}, old {{editor_name}} style, or plain variable name (editorName or editor_name)
    const regex = new RegExp(
      `\\{\\{\\s*${key}\\s*\\}\\}|\\{\\s*${key}\\s*\\}|\\b${key}\\b`,
      "g"
    );
    result = result.replace(regex, String(value));
  }

  return result;
}

export function arrayToCommaSeparatedListWithConjunction(
  conjunction: "and" | "or",
  array: any[]
) {
  if (array.length === 0) {
    return "";
  } else if (array.length === 1) {
    return array[0];
  } else if (array.length === 2) {
    return array.join(` ${conjunction} `);
  } else {
    const allButLast = array.slice(0, -1).join(", ");
    const lastElement = array.slice(-1)[0];
    return `${allButLast}, ${conjunction} ${lastElement}`;
  }
}

export const formatNotificationWithTemplate = (
  content: NotificationContent,
  template: NotificationTemplate
) => {
  let formattedNotification: CreateNotificationPayload | null = null;
  if (!template) {
    return formattedNotification;
  }

  if (
    content.trigger === "Market Center Assignment" &&
    content?.data?.marketCenterAssignment
  ) {
    const context: NotificationContext = {
      editorName: content.data.marketCenterAssignment?.editorName,
      editorEmail: content.data.marketCenterAssignment?.editorEmail,
      marketCenterName: content.data.marketCenterAssignment?.marketCenterName,
      marketCenterId: content.data.marketCenterAssignment?.marketCenterId,
      userName: content.receivingUser?.name,
      userUpdate: content.data.marketCenterAssignment?.userUpdate,
    };
    const subject = renderTemplate({
      templateContent: template.subject,
      variables: extractTemplateVariables(template.variables || {}),
      data: toSnakeCase(context),
    });
    const body = renderTemplate({
      templateContent: template.body,
      variables: extractTemplateVariables(template.variables || {}),
      data: toSnakeCase(context),
    });

    return (formattedNotification = {
      userId: content.receivingUser.id,
      category: "ACTIVITY",
      type: content.trigger,
      title: subject,
      body: body,
      priority: "HIGH",
      data: {
        marketCenterId: content?.data?.marketCenterAssignment?.marketCenterId,
        marketCenterAssignment: content.data.marketCenterAssignment,
      },
    });
  }

  if (
    content.trigger === "Category Assignment" &&
    content?.data?.categoryAssignment
  ) {
    const context: NotificationContext = {
      editorName: content.data.categoryAssignment?.editorName,
      editorEmail: content.data.categoryAssignment?.editorEmail,
      categoryName: content.data.categoryAssignment?.categoryName,
      categoryDescription: content.data.categoryAssignment?.categoryDescription,
      marketCenterName: content.data.categoryAssignment?.marketCenterName,
      marketCenterId: content.data.categoryAssignment?.marketCenterId,
      userName: content.receivingUser?.name,
      userUpdate: content.data.categoryAssignment?.userUpdate,
    };
    const subject = renderTemplate({
      templateContent: template.subject,
      data: toSnakeCase(context),
      variables: extractTemplateVariables(template.variables || {}),
    });
    const body = renderTemplate({
      templateContent: template.body,
      data: toSnakeCase(context),
      variables: extractTemplateVariables(template.variables || {}),
    });

    return (formattedNotification = {
      userId: content?.receivingUser?.id,
      category: "ACTIVITY",
      type: content.trigger,
      title: subject,
      body: body,
      priority: "HIGH",
      data: { categoryAssignment: content.data.categoryAssignment },
    });
  }

  if (content.trigger === "Ticket Created" && content?.data?.createdTicket) {
    const context: NotificationContext = {
      ticketTitle: content.data.createdTicket?.ticketTitle,
      ticketNumber: content.data.createdTicket?.ticketNumber,
      creatorName: content.data.createdTicket?.creatorName,
      creatorId: content.data.createdTicket?.creatorId,
      createdOn: content.data.createdTicket?.createdOn
        ? new Date(content.data.createdTicket?.createdOn).toISOString()
        : undefined,
      dueDate: content.data.createdTicket?.dueDate
        ? new Date(content.data.createdTicket?.dueDate).toISOString()
        : undefined,
      assigneeId: content.data.createdTicket?.assigneeId,
      assigneeName: content.data.createdTicket?.assigneeName,
    };
    const subject = renderTemplate({
      templateContent: template.subject,
      variables: extractTemplateVariables(template.variables || {}),
      data: toSnakeCase(context),
    });
    const body = renderTemplate({
      templateContent: template.body,
      variables: extractTemplateVariables(template.variables || {}),
      data: toSnakeCase(context),
    });
    const assigneeId = content.data.createdTicket?.assigneeId;
    return (formattedNotification = {
      userId: content?.receivingUser?.id,
      category: "ACTIVITY",
      type: content.trigger,
      title: subject,
      body: body,
      priority: assigneeId ? "HIGH" : "MEDIUM",
      data: {
        ticketId: content.data.createdTicket?.ticketNumber,
        createdTicket: content.data.createdTicket,
      },
    });
  }

  if (
    content.trigger === "Ticket Assignment" &&
    content?.data?.ticketAssignment
  ) {
    const context: NotificationContext = {
      ticketTitle: content.data.ticketAssignment?.ticketTitle,
      ticketNumber: content.data.ticketAssignment?.ticketNumber,
      createdOn: content.data.ticketAssignment?.createdOn
        ? new Date(content.data.ticketAssignment?.createdOn).toISOString()
        : undefined,
      updatedOn: content.data.ticketAssignment?.updatedOn
        ? new Date(content.data.ticketAssignment?.updatedOn).toISOString()
        : undefined,
      editorName: content.data.ticketAssignment?.editorName,
      editorId: content.data.ticketAssignment?.editorId,
      updateType: content.data.ticketAssignment?.updateType,
      currentAssignment: content.data.ticketAssignment?.currentAssignment
        ? content.data.ticketAssignment?.currentAssignment?.name
        : undefined,
      previousAssignment: content.data.ticketAssignment?.previousAssignment
        ? content.data.ticketAssignment?.previousAssignment?.name
        : undefined,
    };
    const subject = renderTemplate({
      templateContent: template.subject,
      variables: extractTemplateVariables(template.variables || {}),
      data: toSnakeCase(context),
    });
    const body = renderTemplate({
      templateContent: template.body,
      variables: extractTemplateVariables(template.variables || {}),
      data: toSnakeCase(context),
    });
    return (formattedNotification = {
      userId: content?.receivingUser?.id,
      category: "ACTIVITY",
      type: content.trigger,
      title: subject,
      body: body,
      priority: "HIGH",
      data: {
        ticketId: content.data.ticketAssignment?.ticketNumber,
        userId: content.data.ticketAssignment?.editorId,
        ticketAssignment: content.data.ticketAssignment,
      },
    });
  }

  if (
    content.trigger === "Ticket Updated" &&
    content?.data?.updatedTicket &&
    content?.data?.updatedTicket?.changedDetails
  ) {
    const updates: string[] = [];
    const rawChangedDetails = content.data.updatedTicket?.changedDetails;

    if (
      rawChangedDetails &&
      Array.isArray(rawChangedDetails) &&
      typeof rawChangedDetails[0] === "object" &&
      typeof rawChangedDetails[0] !== "string" &&
      "label" in rawChangedDetails[0]
    ) {
      rawChangedDetails.map((update: ActivityUpdates) => {
        updates.push(update.label);
      });
    }

    const context: NotificationContext = {
      ticketNumber: content.data.updatedTicket?.ticketNumber,
      ticketTitle: content.data.updatedTicket?.ticketTitle,
      createdOn: content.data.updatedTicket?.createdOn
        ? new Date(content.data.updatedTicket?.createdOn).toISOString()
        : undefined,
      updatedOn: content.data.updatedTicket?.updatedOn
        ? new Date(content.data.updatedTicket?.updatedOn).toISOString()
        : undefined,
      editorName: content.data.updatedTicket?.editorName,
      editorId: content.data.updatedTicket?.editorId,
      changedDetails: arrayToCommaSeparatedListWithConjunction("and", updates),
    };
    const subject = renderTemplate({
      templateContent: template.subject,
      variables: extractTemplateVariables(template.variables || {}),
      data: toSnakeCase(context),
    });
    const body = renderTemplate({
      templateContent: template.body,
      variables: extractTemplateVariables(template.variables || {}),
      data: toSnakeCase(context),
    });
    return (formattedNotification = {
      userId: content?.receivingUser?.id,
      category: "ACTIVITY",
      type: content.trigger,
      title: subject,
      body: body,
      priority: "MEDIUM",
      data: { updatedTicket: content.data.updatedTicket },
    });
  }

  if (content.trigger === "New Comments" && content?.data?.newComment) {
    const context: NotificationContext = {
      ticketNumber: content.data.newComment?.ticketNumber,
      ticketTitle: content.data.newComment?.ticketTitle,
      commenterName: content.data.newComment?.commenterName,
      commenterId: content.data.newComment?.commenterId,
      createdOn: content.data.newComment?.createdOn
        ? new Date(content.data.newComment?.createdOn).toISOString()
        : undefined,
      comment: content.data.newComment?.comment,
      isInternal: content.data.newComment?.isInternal ? "Internal" : "External",
    };
    const subject = renderTemplate({
      templateContent: template.subject,
      variables: extractTemplateVariables(template.variables || {}),
      data: toSnakeCase(context),
    });
    const body = renderTemplate({
      templateContent: template.body,
      variables: extractTemplateVariables(template.variables || {}),
      data: toSnakeCase(context),
    });
    return (formattedNotification = {
      userId: content?.receivingUser?.id,
      category: "ACTIVITY",
      type: content.trigger,
      title: subject,
      body: body,
      priority: "MEDIUM",
      data: {
        ticketId: content.data.newComment?.ticketNumber,
        newComment: content.data.newComment,
      },
    });
  }

  if (content.trigger === "Ticket Survey" && content?.data?.ticketSurvey) {
    const context: NotificationContext = {
      ticketNumber: content.data.ticketSurvey?.ticketNumber,
      ticketTitle: content.data.ticketSurvey?.ticketTitle,
      surveyorName: content.data.ticketSurvey?.surveyorName,
    };
    const subject = renderTemplate({
      templateContent: template.subject,
      variables: extractTemplateVariables(template.variables || {}),
      data: toSnakeCase(context),
    });
    const body = renderTemplate({
      templateContent: template.body,
      variables: extractTemplateVariables(template.variables || {}),
      data: toSnakeCase(context),
    });

    return (formattedNotification = {
      userId: content?.receivingUser?.id,
      category: "ACTIVITY",
      type: content.trigger,
      title: subject,
      body: body,
      priority: "MEDIUM",
      data: { ticketSurvey: content.data.ticketSurvey },
    });
  }

  if (
    content.trigger === "Ticket Survey Results" &&
    content?.data?.surveyResults
  ) {
    const context: NotificationContext = {
      ticketNumber: content.data.surveyResults?.ticketNumber,
      ticketTitle: content.data.surveyResults?.ticketTitle,
      staffName: content.data.surveyResults?.staffName,
    };
    const subject = renderTemplate({
      templateContent: template.subject,
      variables: extractTemplateVariables(template.variables || {}),
      data: toSnakeCase(context),
    });
    const body = renderTemplate({
      templateContent: template.body,
      variables: extractTemplateVariables(template.variables || {}),
      data: toSnakeCase(context),
    });

    return (formattedNotification = {
      userId: content?.receivingUser?.id,
      category: "ACTIVITY",
      type: content.trigger,
      title: subject,
      body: body,
      priority: "MEDIUM",
      data: { surveyResults: content.data.surveyResults },
    });
  }

  return formattedNotification;
};

export const formatNotificationWithoutTemplate = (
  content: NotificationContent
): CreateNotificationPayload | null => {
  //
  let formattedNotification: CreateNotificationPayload | null = null;
  if (
    !content ||
    !content?.trigger ||
    !content?.receivingUser ||
    !content?.receivingUser?.id
  ) {
    return formattedNotification;
  }
  //  NO TEMPLATE NEEDED FOR NON-ACTIVITY NOTIFICATIONS
  if (content.trigger === "App Permissions") {
    return (formattedNotification = {
      userId: content?.receivingUser?.id,
      category: "PERMISSIONS",
      type: content.trigger,
      title: "Conductor Permissions",
      body: `${content?.receivingUser?.name}, let's review your notification permissions and preferences`,
      priority: "MEDIUM",
      data: {
        appPermissions: {
          email: content?.receivingUser?.email,
          name: content?.receivingUser?.name,
        },
      },
    });
  }
  if (content.trigger === "Invitation" && content?.data?.invitation) {
    return (formattedNotification = {
      userId: content?.receivingUser?.id,
      category: "ACCOUNT",
      type: "General",
      title: "Join Conductor Ticketing",
      body: `${content.data.invitation?.inviterName} invited you to Conductor Ticketing`,
      priority: "MEDIUM",
      data: { invitation: content.data.invitation as NewUserInvitationProps },
    });
  }

  if (
    content.trigger === "Account Information" &&
    content?.data?.accountInformation &&
    content?.data?.accountInformation?.updates
  ) {
    const updates = content.data.accountInformation.updates.map((update) => {
      return update.value;
    });
    return (formattedNotification = {
      userId: content?.receivingUser?.id,
      category: "ACCOUNT",
      type: content.trigger,
      title: "Account Information Updated",
      body: `${content.data.accountInformation?.changedByName} updated your following information: ${arrayToCommaSeparatedListWithConjunction("and", updates)}`,
      priority: "HIGH",
      data: { accountInformation: content.data.accountInformation },
    });
  }
  return formattedNotification;
};
