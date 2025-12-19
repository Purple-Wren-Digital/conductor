import { inAppTemplateCustomizationRepository } from "./customization-repository";
import {
  CustomizableTemplateType,
  DEFAULT_IN_APP_TEMPLATES,
  InAppTemplateCustomization,
} from "./customization-types";
import { renderTemplate } from "./utils";
import type { Notification, NotificationData, CreateNotificationPayload } from "../types";

/**
 * Maps notification types to our customizable template types
 */
function getTemplateTypeFromNotificationType(type: string): CustomizableTemplateType | null {
  const typeMap: Record<string, CustomizableTemplateType> = {
    "Ticket Created": "TICKET_CREATED",
    "Ticket Updated": "TICKET_UPDATED",
    "Ticket Assignment": "TICKET_ASSIGNMENT",
    "New Comments": "NEW_COMMENTS",
    "Market Center Assignment": "MARKET_CENTER_ASSIGNMENT",
    "Category Assignment": "CATEGORY_ASSIGNMENT",
    "Ticket Survey": "TICKET_SURVEY",
    "Ticket Survey Results": "TICKET_SURVEY_RESULTS",
  };

  return typeMap[type] || null;
}

/**
 * Extracts context variables from notification data for template rendering
 */
function extractContextFromNotificationData(
  data: NotificationData | undefined,
  templateType: CustomizableTemplateType
): Record<string, string> {
  if (!data) return {};

  const context: Record<string, string> = {};

  switch (templateType) {
    case "TICKET_CREATED":
      if (data.createdTicket) {
        context.ticket_number = data.createdTicket.ticketNumber || "";
        context.ticket_title = data.createdTicket.ticketTitle || "";
        context.creator_name = data.createdTicket.creatorName || "";
        context.created_on = data.createdTicket.createdOn
          ? new Date(data.createdTicket.createdOn).toLocaleDateString()
          : "";
        context.due_date = data.createdTicket.dueDate
          ? new Date(data.createdTicket.dueDate).toLocaleDateString()
          : "";
        context.assignee_name = data.createdTicket.assigneeName || "";
      }
      break;

    case "TICKET_UPDATED":
      if (data.updatedTicket) {
        context.ticket_number = data.updatedTicket.ticketNumber || "";
        context.ticket_title = data.updatedTicket.ticketTitle || "";
        context.editor_name = data.updatedTicket.editorName || "";
        context.updated_on = data.updatedTicket.updatedOn
          ? new Date(data.updatedTicket.updatedOn).toLocaleDateString()
          : "";
        if (Array.isArray(data.updatedTicket.changedDetails)) {
          context.changed_details = data.updatedTicket.changedDetails
            .map((d: any) => d.label || d)
            .join(", ");
        }
      }
      break;

    case "TICKET_ASSIGNMENT":
      if (data.ticketAssignment) {
        context.ticket_number = data.ticketAssignment.ticketNumber || "";
        context.ticket_title = data.ticketAssignment.ticketTitle || "";
        context.editor_name = data.ticketAssignment.editorName || "";
        context.current_assignment = data.ticketAssignment.currentAssignment?.name || "";
        context.previous_assignment = data.ticketAssignment.previousAssignment?.name || "";
      }
      break;

    case "NEW_COMMENTS":
      if (data.newComment) {
        context.ticket_number = data.newComment.ticketNumber || "";
        context.ticket_title = data.newComment.ticketTitle || "";
        context.commenter_name = data.newComment.commenterName || "";
        context.comment = data.newComment.comment || "";
      }
      break;

    case "MARKET_CENTER_ASSIGNMENT":
      if (data.marketCenterAssignment) {
        context.market_center_name = data.marketCenterAssignment.marketCenterName || "";
        context.editor_name = data.marketCenterAssignment.editorName || "";
      }
      break;

    case "CATEGORY_ASSIGNMENT":
      if (data.categoryAssignment) {
        context.category_name = data.categoryAssignment.categoryName || "";
        context.category_description = data.categoryAssignment.categoryDescription || "";
        context.market_center_name = data.categoryAssignment.marketCenterName || "";
        context.editor_name = data.categoryAssignment.editorName || "";
      }
      break;

    case "TICKET_SURVEY":
      if (data.ticketSurvey) {
        context.ticket_number = data.ticketSurvey.ticketNumber || "";
        context.ticket_title = data.ticketSurvey.ticketTitle || "";
      }
      break;

    case "TICKET_SURVEY_RESULTS":
      if (data.surveyResults) {
        context.ticket_number = data.surveyResults.ticketNumber || "";
        context.ticket_title = data.surveyResults.ticketTitle || "";
        context.staff_name = data.surveyResults.staffName || "";
      }
      break;
  }

  return context;
}

/**
 * Renders an in-app notification title and body using customization if available.
 * Returns the rendered title and body, or null if no customization exists.
 */
export async function renderCustomizedInAppNotification(
  notificationType: string,
  data: NotificationData | undefined,
  marketCenterId: string | null,
  recipientName?: string
): Promise<{ title: string; body: string } | null> {
  if (!marketCenterId) {
    return null;
  }

  const templateType = getTemplateTypeFromNotificationType(notificationType);
  if (!templateType) {
    return null;
  }

  // Check for customization
  const customization = await inAppTemplateCustomizationRepository.findByMarketCenterAndType(
    marketCenterId,
    templateType
  );

  if (!customization || !customization.isActive) {
    return null;
  }

  // Render with customization
  const context = extractContextFromNotificationData(data, templateType);
  context.user_name = recipientName || "there";

  const variableKeys = Object.keys(context);

  const renderedTitle = renderTemplate({
    templateContent: customization.title,
    variables: variableKeys,
    data: context,
  });

  const renderedBody = renderTemplate({
    templateContent: customization.body,
    variables: variableKeys,
    data: context,
  });

  return {
    title: renderedTitle,
    body: renderedBody,
  };
}

/**
 * Gets the default in-app notification content for a template type
 */
export function getDefaultInAppNotificationContent(
  templateType: CustomizableTemplateType,
  context: Record<string, string>
): { title: string; body: string } {
  const defaultTemplate = DEFAULT_IN_APP_TEMPLATES[templateType];
  const variableKeys = Object.keys(context);

  const renderedTitle = renderTemplate({
    templateContent: defaultTemplate.title,
    variables: variableKeys,
    data: context,
  });

  const renderedBody = renderTemplate({
    templateContent: defaultTemplate.body,
    variables: variableKeys,
    data: context,
  });

  return {
    title: renderedTitle,
    body: renderedBody,
  };
}
