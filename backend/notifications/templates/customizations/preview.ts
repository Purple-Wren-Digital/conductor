import { api, APIError } from "encore.dev/api";
import { getUserContext } from "../../../auth/user-context";
import { subscriptionRepository } from "../../../ticket/db";
import {
  CustomizableTemplateType,
  TEMPLATE_TYPE_LABELS,
  TEMPLATE_VARIABLES,
  DEFAULT_EMAIL_TEMPLATES,
  DEFAULT_IN_APP_TEMPLATES,
} from "../customization-types";
import { renderTemplate } from "../utils";

// =============================================================================
// PREVIEW EMAIL TEMPLATE
// =============================================================================

export interface PreviewEmailTemplateRequest {
  marketCenterId: string;
  templateType: CustomizableTemplateType;
  subject: string;
  greeting: string;
  mainMessage: string;
  buttonText?: string | null;
  visibleFields: string[];
}

export interface PreviewEmailTemplateResponse {
  preview: {
    subject: string;
    greeting: string;
    mainMessage: string;
    buttonText: string | null;
    visibleFieldsData: { label: string; value: string }[];
  };
}

/**
 * Generates a preview of an email template with sample data.
 * Does not save anything - just shows what the email would look like.
 */
export const previewEmailTemplate = api<
  PreviewEmailTemplateRequest,
  PreviewEmailTemplateResponse
>(
  {
    expose: true,
    method: "POST",
    path: "/notifications/template-customizations/email/preview",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();

    // Validate template type
    if (!TEMPLATE_TYPE_LABELS[req.templateType]) {
      throw APIError.invalidArgument(`Invalid template type: ${req.templateType}`);
    }

    // Check user has access to this market center
    const accessibleMarketCenterIds =
      userContext.role === "ADMIN"
        ? await subscriptionRepository.getAccessibleMarketCenterIds(
            userContext.marketCenterId
          )
        : userContext.marketCenterId
          ? [userContext.marketCenterId]
          : [];

    if (!accessibleMarketCenterIds.includes(req.marketCenterId)) {
      throw APIError.permissionDenied(
        "You do not have access to this market center"
      );
    }

    // Build sample data from variable definitions
    const variables = TEMPLATE_VARIABLES[req.templateType];
    const sampleData: Record<string, string> = {};
    for (const variable of variables) {
      sampleData[variable.key] = variable.example;
    }

    // Render each section with sample data
    const variableKeys = Object.keys(sampleData);

    const renderedSubject = renderTemplate({
      templateContent: req.subject,
      variables: variableKeys,
      data: sampleData,
    });

    const renderedGreeting = renderTemplate({
      templateContent: req.greeting,
      variables: variableKeys,
      data: sampleData,
    });

    const renderedMainMessage = renderTemplate({
      templateContent: req.mainMessage,
      variables: variableKeys,
      data: sampleData,
    });

    // Build visible fields data with labels and sample values
    const visibleFieldsData = req.visibleFields
      .map((fieldKey) => {
        const variable = variables.find((v) => v.key === fieldKey);
        if (!variable) return null;
        return {
          label: variable.label,
          value: variable.example,
        };
      })
      .filter((f): f is { label: string; value: string } => f !== null);

    return {
      preview: {
        subject: renderedSubject,
        greeting: renderedGreeting,
        mainMessage: renderedMainMessage,
        buttonText: req.buttonText ?? null,
        visibleFieldsData,
      },
    };
  }
);

// =============================================================================
// PREVIEW IN-APP TEMPLATE
// =============================================================================

export interface PreviewInAppTemplateRequest {
  marketCenterId: string;
  templateType: CustomizableTemplateType;
  title: string;
  body: string;
}

export interface PreviewInAppTemplateResponse {
  preview: {
    title: string;
    body: string;
  };
}

/**
 * Generates a preview of an in-app notification with sample data.
 * Does not save anything - just shows what the notification would look like.
 */
export const previewInAppTemplate = api<
  PreviewInAppTemplateRequest,
  PreviewInAppTemplateResponse
>(
  {
    expose: true,
    method: "POST",
    path: "/notifications/template-customizations/in-app/preview",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();

    // Validate template type
    if (!TEMPLATE_TYPE_LABELS[req.templateType]) {
      throw APIError.invalidArgument(`Invalid template type: ${req.templateType}`);
    }

    // Check user has access to this market center
    const accessibleMarketCenterIds =
      userContext.role === "ADMIN"
        ? await subscriptionRepository.getAccessibleMarketCenterIds(
            userContext.marketCenterId
          )
        : userContext.marketCenterId
          ? [userContext.marketCenterId]
          : [];

    if (!accessibleMarketCenterIds.includes(req.marketCenterId)) {
      throw APIError.permissionDenied(
        "You do not have access to this market center"
      );
    }

    // Build sample data from variable definitions
    const variables = TEMPLATE_VARIABLES[req.templateType];
    const sampleData: Record<string, string> = {};
    for (const variable of variables) {
      sampleData[variable.key] = variable.example;
    }

    // Render with sample data
    const variableKeys = Object.keys(sampleData);

    const renderedTitle = renderTemplate({
      templateContent: req.title,
      variables: variableKeys,
      data: sampleData,
    });

    const renderedBody = renderTemplate({
      templateContent: req.body,
      variables: variableKeys,
      data: sampleData,
    });

    return {
      preview: {
        title: renderedTitle,
        body: renderedBody,
      },
    };
  }
);

// =============================================================================
// GET AVAILABLE VARIABLES FOR A TEMPLATE TYPE
// =============================================================================

export interface GetTemplateVariablesRequest {
  templateType: CustomizableTemplateType;
}

export interface GetTemplateVariablesResponse {
  variables: {
    key: string;
    label: string;
    description: string;
    example: string;
    insertText: string; // What to insert: "{{key}}"
  }[];
}

/**
 * Returns the available variables for a template type.
 * Used by the frontend to populate the variable picker.
 */
export const getTemplateVariables = api<
  GetTemplateVariablesRequest,
  GetTemplateVariablesResponse
>(
  {
    expose: true,
    method: "GET",
    path: "/notifications/template-customizations/variables/:templateType",
    auth: true,
  },
  async (req) => {
    await getUserContext();

    // Validate template type
    if (!TEMPLATE_TYPE_LABELS[req.templateType]) {
      throw APIError.invalidArgument(`Invalid template type: ${req.templateType}`);
    }

    const variables = TEMPLATE_VARIABLES[req.templateType].map((v) => ({
      ...v,
      insertText: `{{${v.key}}}`,
    }));

    return { variables };
  }
);

// =============================================================================
// GET DEFAULT TEMPLATES
// =============================================================================

export interface GetDefaultTemplatesRequest {
  templateType: CustomizableTemplateType;
}

export interface GetDefaultTemplatesResponse {
  emailDefault: {
    subject: string;
    greeting: string;
    mainMessage: string;
    buttonText: string;
    visibleFields: string[];
  };
  inAppDefault: {
    title: string;
    body: string;
  };
}

/**
 * Returns the system default templates for a template type.
 * Used when resetting to defaults or for reference.
 */
export const getDefaultTemplates = api<
  GetDefaultTemplatesRequest,
  GetDefaultTemplatesResponse
>(
  {
    expose: true,
    method: "GET",
    path: "/notifications/template-customizations/defaults/:templateType",
    auth: true,
  },
  async (req) => {
    await getUserContext();

    // Validate template type
    if (!TEMPLATE_TYPE_LABELS[req.templateType]) {
      throw APIError.invalidArgument(`Invalid template type: ${req.templateType}`);
    }

    return {
      emailDefault: DEFAULT_EMAIL_TEMPLATES[req.templateType],
      inAppDefault: DEFAULT_IN_APP_TEMPLATES[req.templateType],
    };
  }
);
