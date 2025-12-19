import { api, APIError } from "encore.dev/api";
import { getUserContext } from "../../../auth/user-context";
import { subscriptionRepository } from "../../../ticket/db";
import {
  emailTemplateCustomizationRepository,
  inAppTemplateCustomizationRepository,
} from "../customization-repository";
import {
  CustomizableTemplateType,
  TEMPLATE_TYPE_LABELS,
  TEMPLATE_VARIABLES,
  EMAIL_VISIBLE_FIELDS,
  DEFAULT_EMAIL_TEMPLATES,
  DEFAULT_IN_APP_TEMPLATES,
  TemplateWithDefaults,
} from "../customization-types";

// =============================================================================
// GET TEMPLATE WITH DEFAULTS FOR EDITING
// =============================================================================

export interface GetTemplateForEditingRequest {
  marketCenterId: string;
  templateType: string;
}

export interface GetTemplateForEditingResponse {
  template: TemplateWithDefaults;
}

/**
 * Gets a specific template type with all data needed for the editing UI.
 * Includes defaults, current customizations (if any), and available variables/fields.
 */
export const getTemplateForEditing = api<
  GetTemplateForEditingRequest,
  GetTemplateForEditingResponse
>(
  {
    expose: true,
    method: "GET",
    path: "/notifications/template-customizations/market-center/:marketCenterId/template/:templateType",
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

    // Check user is admin or staff leader (can edit templates)
    if (userContext.role !== "ADMIN" && userContext.role !== "STAFF_LEADER") {
      throw APIError.permissionDenied(
        "Only admins and staff leaders can edit notification templates"
      );
    }

    // Get existing customizations
    const [emailCustomization, inAppCustomization] = await Promise.all([
      emailTemplateCustomizationRepository.findByMarketCenterAndType(
        req.marketCenterId,
        req.templateType
      ),
      inAppTemplateCustomizationRepository.findByMarketCenterAndType(
        req.marketCenterId,
        req.templateType
      ),
    ]);

    const template: TemplateWithDefaults = {
      templateType: req.templateType,
      label: TEMPLATE_TYPE_LABELS[req.templateType],
      variables: TEMPLATE_VARIABLES[req.templateType],

      // Email
      emailDefault: DEFAULT_EMAIL_TEMPLATES[req.templateType],
      emailCustomization,
      emailVisibleFieldOptions: EMAIL_VISIBLE_FIELDS[req.templateType],

      // In-app
      inAppDefault: DEFAULT_IN_APP_TEMPLATES[req.templateType],
      inAppCustomization,
    };

    return { template };
  }
);
