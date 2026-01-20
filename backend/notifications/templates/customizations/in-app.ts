import { api, APIError } from "encore.dev/api";
import { getUserContext } from "../../../auth/user-context";
import { subscriptionRepository } from "../../../ticket/db";
import { inAppTemplateCustomizationRepository } from "../customization-repository";
import {
  CustomizableTemplateType,
  TEMPLATE_TYPE_LABELS,
  InAppTemplateCustomization,
  CreateInAppTemplateCustomizationInput,
  UpdateInAppTemplateCustomizationInput,
} from "../customization-types";

// =============================================================================
// CREATE/UPDATE IN-APP TEMPLATE CUSTOMIZATION
// =============================================================================

export interface SaveInAppTemplateRequest {
  marketCenterId: string;
  templateType: CustomizableTemplateType;
  title: string;
  body: string;
}

export interface SaveInAppTemplateResponse {
  inAppCustomization: InAppTemplateCustomization;
}

/**
 * Creates or updates an in-app template customization.
 * If a customization already exists, it will be updated.
 * If not, a new one will be created.
 */
export const saveInAppTemplate = api<
  SaveInAppTemplateRequest,
  SaveInAppTemplateResponse
>(
  {
    expose: true,
    method: "POST",
    path: "/notifications/template-customizations/in-app",
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
      await inAppTemplateCustomizationRepository.findByMarketCenterAndType(
        req.marketCenterId,
        req.templateType
      );

    let inAppCustomization: InAppTemplateCustomization;

    if (existing) {
      // Update existing
      const updateInput: UpdateInAppTemplateCustomizationInput = {
        title: req.title,
        body: req.body,
      };
      const updated = await inAppTemplateCustomizationRepository.update(
        existing.id,
        updateInput,
        userContext.userId
      );
      if (!updated) {
        throw APIError.internal(
          "Failed to update in-app template customization"
        );
      }
      inAppCustomization = updated;
    } else {
      // Create new
      const createInput: CreateInAppTemplateCustomizationInput = {
        marketCenterId: req.marketCenterId,
        templateType: req.templateType,
        title: req.title,
        body: req.body,
      };
      inAppCustomization = await inAppTemplateCustomizationRepository.create(
        createInput,
        userContext.userId
      );
    }

    return { inAppCustomization };
  }
);

// =============================================================================
// DELETE IN-APP TEMPLATE CUSTOMIZATION (RESET TO DEFAULT)
// =============================================================================

export interface ResetInAppTemplateRequest {
  marketCenterId: string;
  templateType: string;
}

export interface ResetInAppTemplateResponse {
  success: boolean;
}

/**
 * Deletes an in-app template customization, reverting to the system default.
 */
export const resetInAppTemplate = api<
  ResetInAppTemplateRequest,
  ResetInAppTemplateResponse
>(
  {
    expose: true,
    method: "DELETE",
    path: "/notifications/template-customizations/in-app/:marketCenterId/:templateType",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();

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

    if (
      !accessibleMarketCenterIds ||
      !accessibleMarketCenterIds.length ||
      !accessibleMarketCenterIds.includes(req.marketCenterId)
    ) {
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

    await inAppTemplateCustomizationRepository.deleteByMarketCenterAndType(
      req.marketCenterId,
      req.templateType as CustomizableTemplateType
    );

    return { success: true };
  }
);
