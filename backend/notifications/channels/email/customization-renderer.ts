import * as React from "react";
import { CustomizableEmail } from "@/emails/index";
import type { CustomizableEmailProps } from "@/emails/index";
import type { Notification, NotificationData } from "../../types";
import { emailTemplateCustomizationRepository } from "../../templates/customization-repository";
import {
  CustomizableTemplateType,
  TEMPLATE_VARIABLES,
  DEFAULT_EMAIL_TEMPLATES,
  EmailTemplateCustomization,
} from "../../templates/customization-types";
import { renderTemplate } from "../../templates/utils";
import { secret } from "encore.dev/config";

const APP_BASE_URL = secret("FRONTEND_URL");

/**
 * Maps notification types to our customizable template types
 */
function getTemplateTypeFromNotification(
  notification: Notification
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

  return typeMap[notification.type] || null;
}

/**
 * Extracts context variables from notification data for template rendering
 */
function extractContextFromNotification(
  notification: Notification,
  templateType: CustomizableTemplateType
): Record<string, string> {
  const data = notification.data || {};
  const context: Record<string, string> = {};

  // Common extraction based on template type
  switch (templateType) {
    case "ticket_created":
      if (data.createdTicket) {
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
      if (data.updatedTicket) {
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
      if (data.newComment) {
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
      if (data.marketCenterAssignment) {
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
      if (data.categoryAssignment) {
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
      if (data.ticketSurvey) {
        context.ticket_number = data.ticketSurvey.ticketNumber || "";
        context.ticket_title = data.ticketSurvey.ticketTitle || "";
        context.surveyor_name = data.ticketSurvey.surveyorName || "";
      }
      break;

    case "ticket_survey_results":
      if (data.surveyResults) {
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
 * Generates the CTA button URL based on notification type and data
 */
export function getButtonUrl(
  notification: Notification,
  templateType: CustomizableTemplateType
): string {
  const ticketId =
    notification.data?.createdTicket?.ticketNumber ||
    notification.data?.updatedTicket?.ticketNumber ||
    notification.data?.ticketAssignment?.ticketNumber ||
    notification.data?.newComment?.ticketNumber ||
    notification.data?.ticketSurvey?.ticketNumber ||
    notification.data?.surveyResults?.ticketNumber ||
    notification.data?.ticketId;

  if (ticketId) {
    if (templateType === "ticket_survey") {
      return `${APP_BASE_URL()}/dashboard/tickets/${ticketId}?survey=true`;
    }
    return `${APP_BASE_URL()}/dashboard/tickets/${ticketId}`;
  }

  const marketCenterId =
    notification.data?.marketCenterAssignment?.marketCenterId ||
    notification.data?.categoryAssignment?.marketCenterId;

  if (marketCenterId) {
    return `${APP_BASE_URL()}/dashboard/market-centers/${marketCenterId}`;
  }

  return `${APP_BASE_URL()}/dashboard`;
}

/**
 * Renders a customized email template if one exists for the market center,
 * otherwise returns null to indicate the default template should be used.
 */
export async function renderCustomizedEmailTemplate(
  notification: Notification,
  marketCenterId: string | null,
  recipientName?: string
): Promise<React.ReactElement | null> {
  // If no market center, can't have customization
  if (!marketCenterId) {
    return null;
  }

  // Get the template type for this notification
  const templateType = getTemplateTypeFromNotification(notification);
  if (!templateType) {
    return null;
  }

  // Check for customization
  const customization =
    await emailTemplateCustomizationRepository.findByMarketCenterAndType(
      marketCenterId,
      templateType
    );

  // If no customization or not active, fall back to default
  if (!customization || !customization.isActive) {
    return null;
  }

  // We have a customization - render it
  return renderEmailFromCustomization(
    notification,
    customization,
    templateType,
    recipientName
  );
}

/**
 * Renders an email using the customization data
 */
export function renderEmailFromCustomization(
  notification: Notification,
  customization: EmailTemplateCustomization,
  templateType: CustomizableTemplateType,
  recipientName?: string
): React.ReactElement {
  // Extract context from notification
  const context = extractContextFromNotification(notification, templateType);

  // Add recipient name to context
  context.user_name = recipientName || "there";

  // Get variable keys
  const variableKeys = Object.keys(context);

  // Render each section with variables
  const renderedSubject = renderTemplate({
    templateContent: customization.subject,
    variables: variableKeys,
    data: context,
  });

  const renderedGreeting = renderTemplate({
    templateContent: customization.greeting,
    variables: variableKeys,
    data: context,
  });

  const renderedMainMessage = renderTemplate({
    templateContent: customization.mainMessage,
    variables: variableKeys,
    data: context,
  });

  // Build visible fields data
  const variables = TEMPLATE_VARIABLES[templateType];
  const visibleFieldsData = customization.visibleFields
    .map((fieldKey) => {
      const variable = variables.find((v) => v.key === fieldKey);
      if (!variable) return null;
      const value = context[fieldKey];
      if (!value) return null;
      return {
        label: variable.label,
        value: value,
      };
    })
    .filter((f): f is { label: string; value: string } => f !== null);

  // Get button URL
  const buttonUrl = customization.buttonText
    ? getButtonUrl(notification, templateType)
    : null;

  // Create props for customizable email
  const emailProps: CustomizableEmailProps = {
    subject: renderedSubject,
    greeting: renderedGreeting,
    mainMessage: renderedMainMessage,
    buttonText: customization.buttonText,
    buttonUrl,
    visibleFieldsData,
    previewText: renderedSubject,
  };

  return CustomizableEmail(emailProps) as React.ReactElement;
}

/**
 * Helper to render using default templates (for testing/preview)
 */
export function renderDefaultEmailTemplate(
  // templateType: CustomizableTemplateType,
  // context: Record<string, string>,
  notification: Notification,
  recipientName?: string
): React.ReactElement | null {
  // Get the template type for this notification
  const templateType = getTemplateTypeFromNotification(notification);
  if (!templateType) {
    return null;
  }
  // Extract context from notification
  const context = extractContextFromNotification(notification, templateType);

  // Add recipient name to context
  context.user_name = recipientName || "there";

  const customization = DEFAULT_EMAIL_TEMPLATES[templateType];

  // Get variable keys
  const variableKeys = Object.keys(context);

  // Render each section with variables
  const renderedSubject = renderTemplate({
    templateContent: customization.subject,
    variables: variableKeys,
    data: context,
  });

  const renderedGreeting = renderTemplate({
    templateContent: customization.greeting,
    variables: variableKeys,
    data: context,
  });

  const renderedMainMessage = renderTemplate({
    templateContent: customization.mainMessage,
    variables: variableKeys,
    data: context,
  });

  // Build visible fields data
  const variables = TEMPLATE_VARIABLES[templateType];
  const visibleFieldsData = customization.visibleFields
    .map((fieldKey) => {
      const variable = variables.find((v) => v.key === fieldKey);
      if (!variable) return null;
      const value = context[fieldKey];
      if (!value) return null;
      return {
        label: variable.label,
        value: value,
      };
    })
    .filter((f): f is { label: string; value: string } => f !== null);

  // Get button URL
  const buttonUrl = customization?.buttonText
    ? getButtonUrl(notification, templateType)
    : null;

  // Create props for customizable email
  const emailProps: CustomizableEmailProps = {
    subject: renderedSubject,
    greeting: renderedGreeting,
    mainMessage: renderedMainMessage,
    buttonText: customization.buttonText,
    buttonUrl,
    visibleFieldsData,
    previewText: renderedSubject,
  };

  return CustomizableEmail(emailProps) as React.ReactElement;
}
