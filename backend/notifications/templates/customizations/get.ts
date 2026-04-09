import { api, APIError } from "encore.dev/api";
import { getUserContext } from "../../../auth/user-context";
import { getAccessibleMarketCenterIds } from "../../../auth/permissions";
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
      await getAccessibleMarketCenterIds(userContext);

    if (
      !accessibleMarketCenterIds.length ||
      !accessibleMarketCenterIds.includes(req.marketCenterId)
    ) {
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
        req.templateType as CustomizableTemplateType
      ),
      inAppTemplateCustomizationRepository.findByMarketCenterAndType(
        req.marketCenterId,
        req.templateType as CustomizableTemplateType
      ),
    ]);

    const template: TemplateWithDefaults = {
      templateType: req.templateType as CustomizableTemplateType,
      label: TEMPLATE_TYPE_LABELS[req.templateType as CustomizableTemplateType],
      variables:
        TEMPLATE_VARIABLES[req.templateType as CustomizableTemplateType],

      // Email
      emailDefault:
        DEFAULT_EMAIL_TEMPLATES[req.templateType as CustomizableTemplateType],
      emailCustomization,
      emailVisibleFieldOptions:
        EMAIL_VISIBLE_FIELDS[req.templateType as CustomizableTemplateType],

      // In-app
      inAppDefault:
        DEFAULT_IN_APP_TEMPLATES[req.templateType as CustomizableTemplateType],
      inAppCustomization,
    };

    return { template };
  }
);
