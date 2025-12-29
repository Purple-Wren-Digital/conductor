import { api, APIError } from "encore.dev/api";
import { getUserContext } from "../../../auth/user-context";
import { subscriptionRepository } from "../../../ticket/db";
import { emailTemplateCustomizationRepository } from "../customization-repository";
import {
  CustomizableTemplateType,
  TEMPLATE_TYPE_LABELS,
  EmailTemplateCustomization,
  CreateEmailTemplateCustomizationInput,
  UpdateEmailTemplateCustomizationInput,
} from "../customization-types";

// =============================================================================
// CREATE/UPDATE EMAIL TEMPLATE CUSTOMIZATION
// =============================================================================

export interface SaveEmailTemplateRequest {
  marketCenterId: string;
  templateType: CustomizableTemplateType;
  subject: string;
  greeting: string;
  mainMessage: string;
  buttonText?: string | null;
  visibleFields: string[];
}

export interface SaveEmailTemplateResponse {
  emailCustomization: EmailTemplateCustomization;
}

/**
 * Creates or updates an email template customization.
 * If a customization already exists, it will be updated.
 * If not, a new one will be created.
 */
export const saveEmailTemplate = api<
  SaveEmailTemplateRequest,
  SaveEmailTemplateResponse
>(
  {
    expose: true,
    method: "POST",
    path: "/notifications/template-customizations/email",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();

    // Validate template type
    const allowedTypes = Object.keys(TEMPLATE_TYPE_LABELS);

    if (
      !req.templateType ||
      typeof req.templateType !== "string" ||
      !allowedTypes.includes(req.templateType)
    ) {
      throw APIError.invalidArgument(
        `Invalid template type: ${req.templateType}`
      );
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

    // Check user is admin or staff leader
    if (userContext.role !== "ADMIN" && userContext.role !== "STAFF_LEADER") {
      throw APIError.permissionDenied(
        "Only admins and staff leaders can edit notification templates"
      );
    }

    // Check if customization already exists
    const existing =
      await emailTemplateCustomizationRepository.findByMarketCenterAndType(
        req.marketCenterId,
        req.templateType
      );

    let emailCustomization: EmailTemplateCustomization;

    if (existing) {
      // Update existing
      const updateInput: UpdateEmailTemplateCustomizationInput = {
        subject: req.subject,
        greeting: req.greeting,
        mainMessage: req.mainMessage,
        buttonText: req.buttonText,
        visibleFields: req.visibleFields,
      };
      const updated = await emailTemplateCustomizationRepository.update(
        existing.id,
        updateInput,
        userContext.userId
      );
      if (!updated) {
        throw APIError.internal(
          "Failed to update email template customization"
        );
      }
      emailCustomization = updated;
    } else {
      // Create new
      const createInput: CreateEmailTemplateCustomizationInput = {
        marketCenterId: req.marketCenterId,
        templateType: req.templateType,
        subject: req.subject,
        greeting: req.greeting,
        mainMessage: req.mainMessage,
        buttonText: req.buttonText,
        visibleFields: req.visibleFields,
      };
      emailCustomization = await emailTemplateCustomizationRepository.create(
        createInput,
        userContext.userId
      );
    }

    return { emailCustomization };
  }
);

// =============================================================================
// DELETE EMAIL TEMPLATE CUSTOMIZATION (RESET TO DEFAULT)
// =============================================================================

export interface ResetEmailTemplateRequest {
  marketCenterId: string;
  templateType: string;
}

export interface ResetEmailTemplateResponse {
  success: boolean;
}

/**
 * Deletes an email template customization, reverting to the system default.
 */
export const resetEmailTemplate = api<
  ResetEmailTemplateRequest,
  ResetEmailTemplateResponse
>(
  {
    expose: true,
    method: "DELETE",
    path: "/notifications/template-customizations/email/:marketCenterId/:templateType",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();

    // Validate template type
    const allowedTypes = Object.keys(TEMPLATE_TYPE_LABELS);

    if (
      !req.templateType ||
      typeof req.templateType !== "string" ||
      !allowedTypes.includes(req.templateType)
    ) {
      throw APIError.invalidArgument(
        `Invalid template type: ${req.templateType}`
      );
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

    // Check user is admin or staff leader
    if (userContext.role !== "ADMIN" && userContext.role !== "STAFF_LEADER") {
      throw APIError.permissionDenied(
        "Only admins and staff leaders can edit notification templates"
      );
    }

    await emailTemplateCustomizationRepository.deleteByMarketCenterAndType(
      req.marketCenterId,
      req.templateType as CustomizableTemplateType
    );

    return { success: true };
  }
);
