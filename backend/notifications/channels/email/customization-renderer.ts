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

const APP_BASE_URL = process.env.APP_BASE_URL; // || "https://app.conductorticket.com";

/**
 * Maps notification types to our customizable template types
 */
function getTemplateTypeFromNotification(
  notification: Notification
): CustomizableTemplateType | null {
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
        // Format changed details
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
        context.current_assignment =
          data.ticketAssignment.currentAssignment?.name || "";
        context.previous_assignment =
          data.ticketAssignment.previousAssignment?.name || "";
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
        context.market_center_name =
          data.marketCenterAssignment.marketCenterName || "";
        context.editor_name = data.marketCenterAssignment.editorName || "";
      }
      break;

    case "CATEGORY_ASSIGNMENT":
      if (data.categoryAssignment) {
        context.category_name = data.categoryAssignment.categoryName || "";
        context.category_description =
          data.categoryAssignment.categoryDescription || "";
        context.market_center_name =
          data.categoryAssignment.marketCenterName || "";
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
 * Generates the CTA button URL based on notification type and data
 */
function getButtonUrl(
  notification: Notification,
  templateType: CustomizableTemplateType
): string {
  const ticketId =
    notification.data?.ticketId ||
    notification.data?.createdTicket?.ticketNumber ||
    notification.data?.updatedTicket?.ticketNumber ||
    notification.data?.ticketAssignment?.ticketNumber ||
    notification.data?.newComment?.ticketNumber ||
    notification.data?.ticketSurvey?.ticketNumber ||
    notification.data?.surveyResults?.ticketNumber;

  if (ticketId) {
    if (templateType === "TICKET_SURVEY") {
      return `${APP_BASE_URL}/dashboard/tickets/${ticketId}?survey=true`;
    }
    return `${APP_BASE_URL}/dashboard/tickets/${ticketId}`;
  }

  const marketCenterId =
    notification.data?.marketCenterId ||
    notification.data?.marketCenterAssignment?.marketCenterId ||
    notification.data?.categoryAssignment?.marketCenterId;

  if (marketCenterId) {
    return `${APP_BASE_URL}/dashboard/market-centers/${marketCenterId}`;
  }

  return `${APP_BASE_URL}/dashboard`;
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
function renderEmailFromCustomization(
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
  templateType: CustomizableTemplateType,
  context: Record<string, string>,
  recipientName?: string
): React.ReactElement {
  const defaultTemplate = DEFAULT_EMAIL_TEMPLATES[templateType];
  const variables = TEMPLATE_VARIABLES[templateType];

  // Add recipient name
  context.user_name = recipientName || "there";

  const variableKeys = Object.keys(context);

  const renderedSubject = renderTemplate({
    templateContent: defaultTemplate.subject,
    variables: variableKeys,
    data: context,
  });

  const renderedGreeting = renderTemplate({
    templateContent: defaultTemplate.greeting,
    variables: variableKeys,
    data: context,
  });

  const renderedMainMessage = renderTemplate({
    templateContent: defaultTemplate.mainMessage,
    variables: variableKeys,
    data: context,
  });

  const visibleFieldsData = defaultTemplate.visibleFields
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

  const emailProps: CustomizableEmailProps = {
    subject: renderedSubject,
    greeting: renderedGreeting,
    mainMessage: renderedMainMessage,
    buttonText: defaultTemplate.buttonText,
    buttonUrl: `${APP_BASE_URL}/dashboard`,
    visibleFieldsData,
    previewText: renderedSubject,
  };

  return CustomizableEmail(emailProps) as React.ReactElement;
}
