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

const capitalizeEveryWord = (words: string | undefined) => {
  if (!words) return "";
  const wordArray = words.split(" ");
  const capitalizedArray = wordArray.map(
    (word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  );
  return capitalizedArray.join(" ");
};

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
    userName: "{{user_name}}",
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
    userName: "{{user_name}}",
  } satisfies VariablePlaceholders<AssignedTicketNotificationProps>,
  UpdatedTicketProps: {
    ticketNumber: "{{ticket_number}}",
    ticketTitle: "{{ticket_title}}",
    createdOn: "{{created_on}}",
    updatedOn: "{{updated_on}}",
    editorName: "{{editor_name}}",
    editorId: "{{editor_id}}",
    changedDetails: "{{changed_details}}", // rendered as list
    userName: "{{user_name}}",
  } satisfies VariablePlaceholders<UpdatedTicketProps>,
  NewCommentNotificationProps: {
    ticketNumber: "{{ticket_number}}",
    ticketTitle: "{{ticket_title}}",
    createdOn: "{{created_on}}",
    commenterName: "{{commenter_name}}",
    commenterId: "{{commenter_id}}",
    comment: "{{comment}}",
    isInternal: "{{is_internal}}",
    userName: "{{user_name}}",
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
    userName: "{{user_name}}",
  } satisfies VariablePlaceholders<SurveyResultsProps>,
} as const;

export const notificationTemplatesDefault = [
  {
    templateName: "Market Center Assignment",
    templateDescription: "Sent when a user is added to a market center",
    category: "ACTIVITY" as NotificationCategory,
    channel: "IN_APP" as NotificationChannel,
    type: "Market Center Assignment",
    subject: "Market Center Assignment Update",
    body: `{{editor_name}} {{user_update}} you to/from {{market_center_name}}`,
    variables: NotificationTemplateVariables.MarketCenterAssignmentProps,
    isDefault: true,
    isActive: true,
  },
  {
    templateName: "Category Assignment",
    templateDescription: "Sent when a user is added to a Ticket Category",
    category: "ACTIVITY" as NotificationCategory,
    channel: "IN_APP" as NotificationChannel,
    type: "Category Assignment",
    subject: "Category Assignment Update",
    body: `"{{category_name}}" has been {{user_update}} to/from your assigned ticket categories`,
    variables: NotificationTemplateVariables.CategoryAssignmentProps,
    isDefault: true,
    isActive: true,
  },
  {
    templateName: "Ticket Created",
    templateDescription: "Sent when a user creates a ticket",
    category: "ACTIVITY" as NotificationCategory,
    channel: "IN_APP" as NotificationChannel,
    type: "Ticket Created",
    subject: "New Ticket Created",
    body: `'{{ticket_title}}' was created by {{creator_name}}`,
    variables: NotificationTemplateVariables.CreatedTicketNotificationProps,
    isDefault: true,
    isActive: true,
  },
  {
    templateName: "Ticket Assignment",
    templateDescription:
      "Sent when a user is assigned to or unassigned from a Ticket",
    category: "ACTIVITY" as NotificationCategory,
    channel: "IN_APP" as NotificationChannel,
    type: "Ticket Assignment",
    subject: "Ticket Assignment Update",
    body: `"{{ticket_title}}" has been {{update_type}} to/from your queue`,
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
    templateName: "New Comments",
    templateDescription: "Sent when a new comment is added to a ticket",
    category: "ACTIVITY" as NotificationCategory,
    channel: "IN_APP" as NotificationChannel,
    type: "New Comments",
    subject: "New Comment for '{{ticket_title}}'",
    body: `{{commenter_name}} added a new comment to "{{ticket_title}}": "{{comment}}"`,
    variables: NotificationTemplateVariables.NewCommentNotificationProps,
    isDefault: true,
    isActive: true,
  },
  {
    templateName: "Ticket Survey",
    templateDescription:
      "Sent to the ticket's creator when marked as resolved. Surveys are not generated for internal tickets.",
    category: "ACTIVITY" as NotificationCategory,
    channel: "IN_APP" as NotificationChannel,
    type: "Ticket Survey",
    subject: `New Survey for "{{ticket_title}}"`,
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
    subject: "Survey Results: {{ticket_title}}",
    body: "New feedback is available",
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

export const formatNotificationWithTemplate = ({
  content,
  template,
}: {
  content: NotificationContent;
  template: {
    email: NotificationTemplate | null;
    inApp: NotificationTemplate | null;
  };
}) => {
  let formattedNotification: CreateNotificationPayload | null = null;
  if (!template || !content || !content?.data) {
    return formattedNotification;
  }
  const changedDetails: string[] = [];
  const rawChangedDetails = content.data.updatedTicket?.changedDetails;

  if (
    rawChangedDetails &&
    Array.isArray(rawChangedDetails) &&
    typeof rawChangedDetails[0] === "object" &&
    typeof rawChangedDetails[0] !== "string" &&
    "label" in rawChangedDetails[0]
  ) {
    rawChangedDetails.map((update: ActivityUpdates) => {
      const formattedLabel = capitalizeEveryWord(update.label);
      changedDetails.push(formattedLabel);
    });
  }

  const createdOn =
    content.data?.createdTicket?.createdOn ??
    content.data?.ticketAssignment?.createdOn ??
    content.data?.updatedTicket?.createdOn ??
    content.data?.newComment?.createdOn;

  const updatedOn =
    content.data?.ticketAssignment?.updatedOn ??
    content.data?.updatedTicket?.updatedOn;

  const context: NotificationContext = {
    assigneeId: content.data?.createdTicket?.assigneeId,
    assigneeName: content.data?.createdTicket?.assigneeName,
    categoryName: content.data?.categoryAssignment?.categoryName,
    categoryDescription: content.data?.categoryAssignment?.categoryDescription,
    changedDetails:
      changedDetails && changedDetails.length > 0
        ? arrayToCommaSeparatedListWithConjunction("and", changedDetails)
        : undefined,
    comment: content.data?.newComment?.comment,
    commenterName: content.data?.newComment?.commenterName,
    commenterId: content.data?.newComment?.commenterId,
    creatorName: content.data?.createdTicket?.creatorName,
    creatorId: content.data?.createdTicket?.creatorId,
    createdOn: createdOn ? new Date(createdOn).toISOString() : undefined,
    currentAssignment: content.data?.ticketAssignment?.currentAssignment
      ? content.data.ticketAssignment.currentAssignment
      : undefined,
    dueDate: content.data?.createdTicket?.dueDate
      ? new Date(content.data?.createdTicket?.dueDate).toISOString()
      : undefined,
    editorName:
      content.data?.marketCenterAssignment?.editorName ??
      content.data?.categoryAssignment?.editorName ??
      content.data?.ticketAssignment?.editorName ??
      content.data?.updatedTicket?.editorName,
    editorEmail:
      content.data?.marketCenterAssignment?.editorEmail ??
      content.data?.categoryAssignment?.editorEmail,
    editorId:
      content.data?.ticketAssignment?.editorId ??
      content.data?.updatedTicket?.editorId,
    isInternal:
      content.data?.newComment?.isInternal === true
        ? "Internal"
        : content.data?.newComment?.isInternal === false
          ? "External"
          : undefined,
    marketCenterName:
      content.data?.marketCenterAssignment?.marketCenterName ??
      content.data?.categoryAssignment?.marketCenterName,
    marketCenterId:
      content.data?.marketCenterAssignment?.marketCenterId ??
      content.data?.categoryAssignment?.marketCenterId,
    previousAssignment: content.data?.ticketAssignment?.previousAssignment
      ? content.data.ticketAssignment.previousAssignment
      : undefined,
    staffName: content.data?.surveyResults?.staffName,
    surveyorName: content.data?.ticketSurvey?.surveyorName,
    ticketTitle:
      content.data?.createdTicket?.ticketTitle ??
      content.data?.ticketAssignment?.ticketTitle ??
      content.data?.updatedTicket?.ticketTitle ??
      content.data?.newComment?.ticketTitle ??
      content.data?.ticketSurvey?.ticketTitle ??
      content.data?.surveyResults?.ticketTitle,
    ticketNumber:
      content.data?.createdTicket?.ticketNumber ??
      content.data?.ticketAssignment?.ticketNumber ??
      content.data?.updatedTicket?.ticketNumber ??
      content.data?.newComment?.ticketNumber ??
      content.data?.ticketSurvey?.ticketNumber ??
      content.data?.surveyResults?.ticketNumber,
    updatedOn: updatedOn ? new Date(updatedOn).toISOString() : undefined,
    updateType: content.data?.ticketAssignment?.updateType,
    userName: content?.receivingUser?.name,
    userUpdate:
      content.data?.marketCenterAssignment?.userUpdate ??
      content.data?.categoryAssignment?.userUpdate,
  };

  const subjectEmail =
    template && template?.email
      ? renderTemplate({
          templateContent: template.email.subject,
          variables: extractTemplateVariables(template.email.variables || {}),
          data: toSnakeCase({ ...context }),
        })
      : "";
  const bodyEmail =
    template && template?.email
      ? renderTemplate({
          templateContent: template.email.body,
          variables: extractTemplateVariables(template.email.variables || {}),
          data: toSnakeCase(context),
        })
      : "";

  const subjectInApp =
    template && template?.inApp
      ? renderTemplate({
          templateContent: template.inApp.subject,
          variables: extractTemplateVariables(template.inApp.variables || {}),
          data: toSnakeCase(context),
        })
      : "";
  const bodyInApp =
    template && template?.inApp
      ? renderTemplate({
          templateContent: template.inApp.body,
          variables: extractTemplateVariables(template.inApp.variables || {}),
          data: toSnakeCase(context),
        })
      : "";

  // format based on notification type
  if (
    content.trigger === "Market Center Assignment" &&
    content?.data?.marketCenterAssignment
  ) {
    formattedNotification = {
      userId: content.receivingUser.id,
      category: "ACTIVITY",
      type: content.trigger,
      email:
        template && template?.email
          ? { title: subjectEmail, body: bodyEmail }
          : "Notifications deactivated",

      inApp:
        template && template?.inApp
          ? { title: subjectInApp, body: bodyInApp }
          : "Notifications deactivated",
      priority: "HIGH",
      data: {
        marketCenterId: content?.data?.marketCenterAssignment?.marketCenterId,
        marketCenterAssignment: content.data.marketCenterAssignment,
      },
    };
  }

  if (
    content.trigger === "Category Assignment" &&
    content?.data?.categoryAssignment
  ) {
    formattedNotification = {
      userId: content?.receivingUser?.id,
      category: "ACTIVITY",
      type: content.trigger,
      email:
        template && template?.email
          ? { title: subjectEmail, body: bodyEmail }
          : "Notifications deactivated",
      inApp:
        template && template?.inApp
          ? { title: subjectInApp, body: bodyInApp }
          : "Notifications deactivated",
      priority: "HIGH",
      data: { categoryAssignment: content.data.categoryAssignment },
    };
  }

  if (content.trigger === "Ticket Created" && content?.data?.createdTicket) {
    formattedNotification = {
      userId: content?.receivingUser?.id,
      category: "ACTIVITY",
      type: content.trigger,
      email:
        template && template?.email
          ? { title: subjectEmail, body: bodyEmail }
          : "Notifications deactivated",
      inApp:
        template && template?.inApp
          ? { title: subjectInApp, body: bodyInApp }
          : "Notifications deactivated",
      priority: content?.data?.createdTicket?.assigneeId ? "HIGH" : "MEDIUM",
      data: {
        ticketId: content.data.createdTicket?.ticketNumber,
        createdTicket: content.data.createdTicket,
      },
    };
  }

  if (
    content.trigger === "Ticket Assignment" &&
    content?.data?.ticketAssignment
  ) {
    formattedNotification = {
      userId: content?.receivingUser?.id,
      category: "ACTIVITY",
      type: content.trigger,
      email:
        template && template?.email
          ? { title: subjectEmail, body: bodyEmail }
          : "Notifications deactivated",
      inApp:
        template && template?.inApp
          ? { title: subjectInApp, body: bodyInApp }
          : "Notifications deactivated",
      priority: "HIGH",
      data: {
        ticketId: content.data.ticketAssignment?.ticketNumber,
        userId: content.data.ticketAssignment?.editorId,
        ticketAssignment: content.data.ticketAssignment,
      },
    };
  }

  if (
    content.trigger === "Ticket Updated" &&
    content?.data?.updatedTicket &&
    content?.data?.updatedTicket?.changedDetails
  ) {
    formattedNotification = {
      userId: content?.receivingUser?.id,
      category: "ACTIVITY",
      type: content.trigger,
      email:
        template && template?.email
          ? { title: subjectEmail, body: bodyEmail }
          : "Notifications deactivated",
      inApp:
        template && template?.inApp
          ? { title: subjectInApp, body: bodyInApp }
          : "Notifications deactivated",
      priority: "MEDIUM",
      data: { updatedTicket: content.data.updatedTicket },
    };
  }

  if (content.trigger === "New Comments" && content?.data?.newComment) {
    formattedNotification = {
      userId: content?.receivingUser?.id,
      category: "ACTIVITY",
      type: content.trigger,
      email:
        template && template?.email
          ? { title: subjectEmail, body: bodyEmail }
          : "Notifications deactivated",
      inApp:
        template && template?.inApp
          ? { title: subjectInApp, body: bodyInApp }
          : "Notifications deactivated",
      priority: "MEDIUM",
      data: {
        ticketId: content.data.newComment?.ticketNumber,
        newComment: content.data.newComment,
      },
    };
  }

  if (content.trigger === "Ticket Survey" && content?.data?.ticketSurvey) {
    formattedNotification = {
      userId: content?.receivingUser?.id,
      category: "ACTIVITY",
      type: content.trigger,
      email:
        template && template?.email
          ? { title: subjectEmail, body: bodyEmail }
          : "Notifications deactivated",
      inApp:
        template && template?.inApp
          ? { title: subjectInApp, body: bodyInApp }
          : "Notifications deactivated",
      priority: "MEDIUM",
      data: { ticketSurvey: content.data.ticketSurvey },
    };
  }

  if (
    content.trigger === "Ticket Survey Results" &&
    content?.data?.surveyResults
  ) {
    formattedNotification = {
      userId: content?.receivingUser?.id,
      category: "ACTIVITY",
      type: content.trigger,
      email:
        template && template?.email
          ? { title: subjectEmail, body: bodyEmail }
          : "Notifications deactivated",
      inApp:
        template && template?.inApp
          ? { title: subjectInApp, body: bodyInApp }
          : "Notifications deactivated",
      priority: "MEDIUM",
      data: { surveyResults: content.data.surveyResults },
    };
  }

  return formattedNotification;
};

export const formatNotificationWithoutTemplate = (
  content: NotificationContent,
  emailEnabled: boolean,
  inAppEnabled: boolean
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
    formattedNotification = {
      userId: content?.receivingUser?.id,
      category: "PERMISSIONS",
      type: content.trigger,
      email: emailEnabled
        ? {
            title: "Conductor Permissions",
            body: `${content?.receivingUser?.name}, let's review your notification permissions and preferences`,
          }
        : "Notifications deactivated",
      inApp: inAppEnabled
        ? {
            title: "Conductor Permissions",
            body: `${content?.receivingUser?.name}, let's review your notification permissions and preferences`,
          }
        : "Notifications deactivated",
      priority: "MEDIUM",
      data: {
        appPermissions: {
          email: content?.receivingUser?.email,
          name: content?.receivingUser?.name,
        },
      },
    };
  }
  if (content.trigger === "Invitation" && content?.data?.invitation) {
    formattedNotification = {
      userId: content?.receivingUser?.id,
      category: "ACCOUNT",
      type: "General",
      email: {
        title: "Join Conductor Ticketing",
        body: `${content.data.invitation?.inviterName} invited you to Conductor Ticketing`,
      },
      inApp: {
        title: "Join Conductor Ticketing",
        body: `${content.data.invitation?.inviterName} invited you to Conductor Ticketing`,
      },
      priority: "MEDIUM",
      data: { invitation: content.data.invitation as NewUserInvitationProps },
    };
  }

  if (
    content.trigger === "Account Information" &&
    content?.data?.accountInformation &&
    content?.data?.accountInformation?.updates
  ) {
    const updates = content.data.accountInformation.updates.map((update) => {
      return update.value;
    });
    formattedNotification = {
      userId: content?.receivingUser?.id,
      category: "ACCOUNT",
      type: content.trigger,
      email: emailEnabled
        ? {
            title: "Account Information Updated",
            body: `${content.data.accountInformation?.changedByName} updated your following information: ${arrayToCommaSeparatedListWithConjunction(
              "and",
              updates
            )}`,
          }
        : "Notifications deactivated",
      inApp: inAppEnabled
        ? {
            title: "Account Information Updated",
            body: `${content.data.accountInformation?.changedByName} updated your following information: ${arrayToCommaSeparatedListWithConjunction(
              "and",
              updates
            )}`,
          }
        : "Notifications deactivated",
      priority: "HIGH",
      data: { accountInformation: content.data.accountInformation },
    };
  }

  return formattedNotification;
};
