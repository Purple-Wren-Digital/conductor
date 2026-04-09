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
  TemplateStatus,
  EmailTemplateCustomization,
  InAppTemplateCustomization,
} from "../customization-types";

// =============================================================================
// LIST ALL TEMPLATE STATUSES FOR A MARKET CENTER
// =============================================================================

export interface ListTemplateStatusesRequest {
  marketCenterId: string;
}

export interface ListTemplateStatusesResponse {
  templates: TemplateStatus[];
}

/**
 * Lists all template types with their customization status for a market center.
 * Shows whether each template type is using default or custom content.
 */
export const listTemplateStatuses = api<
  ListTemplateStatusesRequest,
  ListTemplateStatusesResponse
>(
  {
    expose: true,
    method: "GET",
    path: "/notifications/template-customizations/market-center/:marketCenterId",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();

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

    // Get all customizations for this market center
    const [emailCustomizations, inAppCustomizations] = await Promise.all([
      emailTemplateCustomizationRepository.findAllByMarketCenter(
        req.marketCenterId
      ),
      inAppTemplateCustomizationRepository.findAllByMarketCenter(
        req.marketCenterId
      ),
    ]);

    // Build a map for quick lookup
    const emailMap = new Map<string, EmailTemplateCustomization>();
    const inAppMap = new Map<string, InAppTemplateCustomization>();

    for (const ec of emailCustomizations) {
      emailMap.set(ec.templateType, ec);
    }
    for (const ic of inAppCustomizations) {
      inAppMap.set(ic.templateType, ic);
    }

    // Build status for each template type
    const templateTypes = Object.keys(
      TEMPLATE_TYPE_LABELS
    ) as CustomizableTemplateType[];
    const templates: TemplateStatus[] = templateTypes.map((templateType) => ({
      templateType,
      label: TEMPLATE_TYPE_LABELS[templateType],
      hasEmailCustomization: emailMap.has(templateType),
      hasInAppCustomization: inAppMap.has(templateType),
      emailCustomization: emailMap.get(templateType) ?? null,
      inAppCustomization: inAppMap.get(templateType) ?? null,
    }));

    return { templates };
  }
);
