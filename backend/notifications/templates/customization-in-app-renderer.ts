import { inAppTemplateCustomizationRepository } from "./customization-repository";
import {
  CustomizableTemplateType,
  DEFAULT_IN_APP_TEMPLATES,
} from "./customization-types";
import { renderTemplate } from "./utils";
import type { NotificationData } from "../types";

/**
 * Maps notification types to our customizable template types
 */
function getTemplateTypeFromNotificationType(
  type: string
): CustomizableTemplateType | null {
  const typeMap: Record<string, CustomizableTemplateType> = {
    "Ticket Created": "ticket_created",
    "Ticket Updated": "ticket_updated",
    "Ticket Assignment": "ticket_assignment",
    "New Comments": "new_comments",
    "Market Center Assignment": "market_center_assignment",
    "Category Assignment": "category_assignment",
    "Ticket Survey": "ticket_survey",
    "Ticket Survey Results": "ticket_survey_results",
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
    case "ticket_created":
      if (data?.createdTicket) {
        context.ticket_number = data.createdTicket.ticketNumber || "";
        context.ticket_title = data.createdTicket.ticketTitle || "";
        context.creator_name = data.createdTicket.creatorName || "";
        context.creator_id = data.createdTicket.creatorId || "";
        context.created_on = data.createdTicket.createdOn
          ? new Date(data.createdTicket.createdOn).toLocaleDateString()
          : "";
        context.due_date = data.createdTicket.dueDate
          ? new Date(data.createdTicket.dueDate).toLocaleDateString()
          : "";
        context.assignee_id = data.createdTicket.assigneeId || "";
        context.assignee_name = data.createdTicket.assigneeName || "";
        context.user_name = data.createdTicket.userName || "";
      }
      break;

    case "ticket_updated":
      if (data?.updatedTicket) {
        context.ticket_number = data.updatedTicket.ticketNumber || "";
        context.ticket_title = data.updatedTicket.ticketTitle || "";
        context.created_on = data.updatedTicket.createdOn
          ? new Date(data.updatedTicket.createdOn).toLocaleDateString()
          : "";
        context.updated_on = data.updatedTicket.updatedOn
          ? new Date(data.updatedTicket.updatedOn).toLocaleDateString()
          : "";
        context.editor_name = data.updatedTicket.editorName || "";
        context.editor_id = data.updatedTicket.editorId || "";
        // Format changed details
        if (Array.isArray(data.updatedTicket.changedDetails)) {
          context.changed_details = data.updatedTicket.changedDetails
            .map((d: any) => d.label || d)
            .join(", ");
        }
        context.user_name = data.updatedTicket.userName || "";
      }
      break;

    case "ticket_assignment":
      if (data?.ticketAssignment) {
        context.ticket_number = data.ticketAssignment?.ticketNumber || "";
        context.ticket_title = data.ticketAssignment?.ticketTitle || "";
        context.created_on = data.ticketAssignment?.createdOn
          ? new Date(data.ticketAssignment.createdOn).toLocaleDateString()
          : "";
        context.updated_on = data.ticketAssignment?.updatedOn
          ? new Date(data.ticketAssignment.updatedOn).toLocaleDateString()
          : new Date().toLocaleDateString();
        context.editor_name = data.ticketAssignment?.editorName || "";
        context.editor_id = data.ticketAssignment?.editorId || "";
        context.update_type = data.ticketAssignment?.updateType || "";
        context.current_assignment =
          data.ticketAssignment?.currentAssignment || "";
        context.previous_assignment =
          data.ticketAssignment?.previousAssignment || "";
        context.user_name = data.ticketAssignment?.userName || "";
      }
      break;

    case "new_comments":
      if (data?.newComment) {
        context.ticket_number = data.newComment.ticketNumber || "";
        context.ticket_title = data.newComment.ticketTitle || "";
        context.created_on = data.newComment.createdOn
          ? new Date(data.newComment.createdOn).toLocaleDateString()
          : "";
        context.commenter_name = data.newComment.commenterName || "";
        context.commenter_id = data.newComment.commenterId || "";
        context.comment = data.newComment.comment || "";
        context.is_internal = data.newComment.isInternal
          ? "Internal"
          : "External";
        context.user_name = data.newComment.userName || "";
      }
      break;

    case "market_center_assignment":
      if (data?.marketCenterAssignment) {
        context.user_update = data?.marketCenterAssignment?.userUpdate || "";
        context.market_center_name =
          data.marketCenterAssignment.marketCenterName || "";
        context.market_center_id =
          data.marketCenterAssignment.marketCenterId || "";
        context.user_name = data.marketCenterAssignment.userName || "";
        context.editor_name = data.marketCenterAssignment.editorName || "";
        context.editor_email = data.marketCenterAssignment.editorEmail || "";
      }
      break;

    case "category_assignment":
      if (data?.categoryAssignment) {
        context.user_update = data?.categoryAssignment?.userUpdate || "";
        context.category_name = data.categoryAssignment.categoryName || "";
        context.category_description =
          data.categoryAssignment?.categoryDescription || "";
        context.market_center_name =
          data.categoryAssignment?.marketCenterName || "";
        context.market_center_id =
          data.categoryAssignment?.marketCenterId || "";
        context.user_name = data.categoryAssignment?.userName || "";
        context.editor_name = data.categoryAssignment?.editorName || "";
        context.editor_email = data.categoryAssignment?.editorEmail || "";
      }
      break;

    case "ticket_survey":
      if (data?.ticketSurvey) {
        context.ticket_number = data.ticketSurvey.ticketNumber || "";
        context.ticket_title = data.ticketSurvey.ticketTitle || "";
        context.surveyor_name = data.ticketSurvey.surveyorName || "";
      }
      break;

    case "ticket_survey_results":
      if (data?.surveyResults) {
        context.ticket_number = data.surveyResults.ticketNumber || "";
        context.ticket_title = data.surveyResults.ticketTitle || "";
        context.staff_name = data.surveyResults.staffName || "";
        context.user_name = data.surveyResults.userName || "";
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
  const customization =
    await inAppTemplateCustomizationRepository.findByMarketCenterAndType(
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
