import { api, APIError } from "encore.dev/api";
import { getUserContext } from "../auth/user-context";
import { getAccessibleMarketCenterIds } from "../auth/permissions";
import { marketCenterRepository } from "../shared/repositories";
import type {
  MarketCenterSettings,
  SponsorSlot,
  SponsorSlotKey,
  SponsorSlots,
} from "./types";
import { sponsorAssets } from "./sponsor-assets";

const SPONSOR_SLOT_KEYS: SponsorSlotKey[] = [
  "header",
  "dashboardCard",
  "ticketListRow",
];

const MAX_SPONSOR_ASSET_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_SPONSOR_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
];

function isSponsorSlotKey(value: string): value is SponsorSlotKey {
  return (SPONSOR_SLOT_KEYS as string[]).includes(value);
}

/**
 * Validate sponsor slots arriving as JSON. Throws APIError.invalidArgument
 * on the first violation found.
 */
function validateSponsorSlots(
  sponsorSlots: SponsorSlots,
  marketCenterId: string
): SponsorSlots {
  if (!sponsorSlots || typeof sponsorSlots !== "object") {
    throw APIError.invalidArgument("sponsorSlots must be an object");
  }

  for (const key of Object.keys(sponsorSlots)) {
    if (!isSponsorSlotKey(key)) {
      throw APIError.invalidArgument(`Unknown sponsor slot key: ${key}`);
    }
  }

  for (const key of SPONSOR_SLOT_KEYS) {
    const slot = sponsorSlots[key];
    if (!slot) {
      continue;
    }

    if (slot.enabled === true && (!slot.imageKey || !slot.imageKey.trim())) {
      throw APIError.invalidArgument(
        `Sponsor slot "${key}" must have an image before it can be enabled`
      );
    }

    if (
      slot.linkUrl &&
      slot.linkUrl.trim() &&
      !/^https?:\/\//.test(slot.linkUrl)
    ) {
      throw APIError.invalidArgument(
        `Sponsor slot "${key}" linkUrl must start with http:// or https://`
      );
    }

    if (slot.name && slot.name.length > 100) {
      throw APIError.invalidArgument(
        `Sponsor slot "${key}" name must be 100 characters or fewer`
      );
    }

    if (slot.imageKey && !slot.imageKey.startsWith(`${marketCenterId}/`)) {
      throw APIError.invalidArgument(
        `Sponsor slot "${key}" imageKey must belong to this market center`
      );
    }
  }

  return sponsorSlots;
}

// ============================================================================
// Get Sponsor Slots
// ============================================================================

export interface GetSponsorSlotsRequest {
  marketCenterId: string;
}

export interface SponsorSlotWithUrl extends SponsorSlot {
  imageUrl?: string;
}

export interface SponsorSlotsWithUrls {
  header?: SponsorSlotWithUrl;
  dashboardCard?: SponsorSlotWithUrl;
  ticketListRow?: SponsorSlotWithUrl;
}

export interface GetSponsorSlotsResponse {
  sponsorSlots: SponsorSlotsWithUrls;
}

/**
 * Get sponsor slot settings for a market center, with resolved public
 * image URLs for any configured slot.
 */
export const getSponsorSlots = api<
  GetSponsorSlotsRequest,
  GetSponsorSlotsResponse
>(
  {
    expose: true,
    method: "GET",
    path: "/settings/partner-slots/:marketCenterId",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();

    // Only STAFF_LEADER and ADMIN can view sponsor settings
    if (
      !userContext?.role ||
      userContext?.role === "AGENT" ||
      userContext?.role === "STAFF"
    ) {
      throw APIError.permissionDenied(
        "Only staff leaders and administrators can view sponsor settings"
      );
    }

    const marketCenter = await marketCenterRepository.findById(
      req.marketCenterId
    );

    if (!marketCenter) {
      throw APIError.notFound("Market center not found");
    }

    if (userContext.role === "STAFF_LEADER") {
      if (userContext.marketCenterId !== req.marketCenterId) {
        throw APIError.permissionDenied(
          "You do not have access to this market center's settings"
        );
      }
    }
    // ⬇️ ONLY admins hit this
    else if (userContext.role === "ADMIN") {
      const accessibleMarketCenterIds =
        await getAccessibleMarketCenterIds(userContext);

      if (!accessibleMarketCenterIds.length) {
        throw APIError.permissionDenied(
          "You do not have access to this market center's settings"
        );
      }

      const includesMarketCenterId = accessibleMarketCenterIds.some(
        (id) => id === req?.marketCenterId
      );

      if (!includesMarketCenterId) {
        throw APIError.permissionDenied(
          "You do not have access to this market center's settings"
        );
      }
    }

    const sponsorSlots: SponsorSlots =
      marketCenter?.settings?.sponsorSlots ?? {};

    const sponsorSlotsWithUrls: SponsorSlotsWithUrls = {};
    for (const key of SPONSOR_SLOT_KEYS) {
      const slot = sponsorSlots[key];
      if (!slot) {
        continue;
      }

      const enriched: SponsorSlotWithUrl = { ...slot };
      if (slot.imageKey) {
        enriched.imageUrl = sponsorAssets.publicUrl(slot.imageKey);
      }
      sponsorSlotsWithUrls[key] = enriched;
    }

    return { sponsorSlots: sponsorSlotsWithUrls };
  }
);

// ============================================================================
// Update Sponsor Slots
// ============================================================================

export interface UpdateSponsorSlotsRequest {
  marketCenterId: string;
  sponsorSlots: SponsorSlots;
}

export interface UpdateSponsorSlotsResponse {
  sponsorSlots: SponsorSlots;
}

/**
 * Update sponsor slot settings for a market center.
 * Only STAFF_LEADER and ADMIN can modify these settings.
 */
export const updateSponsorSlots = api<
  UpdateSponsorSlotsRequest,
  UpdateSponsorSlotsResponse
>(
  {
    expose: true,
    method: "PUT",
    path: "/settings/partner-slots/:marketCenterId",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();
    const isStaffLeader = userContext?.role === "STAFF_LEADER";
    const isAdmin = userContext?.role === "ADMIN";

    // Only STAFF_LEADER and ADMIN can update sponsor settings
    if (
      !userContext?.role ||
      userContext?.role === "AGENT" ||
      userContext?.role === "STAFF"
    ) {
      throw APIError.permissionDenied(
        "Only staff leaders and administrators can update sponsor settings"
      );
    }

    const marketCenter = await marketCenterRepository.findById(
      req.marketCenterId
    );
    if (!marketCenter) {
      throw APIError.notFound("Market center not found");
    }

    // Verify user has access to this market center
    const accessibleMarketCenterIds =
      await getAccessibleMarketCenterIds(userContext);

    let includesMarketCenterId = false;
    if (accessibleMarketCenterIds && accessibleMarketCenterIds.length > 0) {
      for (const id of accessibleMarketCenterIds) {
        if (id === req.marketCenterId) {
          includesMarketCenterId = true;
          break;
        }
      }
    }

    const marketCenterId: string | undefined =
      isAdmin && includesMarketCenterId
        ? req.marketCenterId
        : isStaffLeader && userContext?.marketCenterId === req.marketCenterId
          ? userContext.marketCenterId
          : undefined;

    if (!marketCenterId) {
      throw APIError.permissionDenied(
        "You do not have access to this market center's settings"
      );
    }

    const sponsorSlots = validateSponsorSlots(
      req.sponsorSlots,
      req.marketCenterId
    );

    const currentSettings =
      (marketCenter.settings as MarketCenterSettings) ?? {};

    const updatedSettings: MarketCenterSettings = {
      ...currentSettings,
      sponsorSlots,
    };

    // Update market center settings
    const updatedMarketCenter = await marketCenterRepository.update(
      req.marketCenterId,
      {
        settings: updatedSettings,
      }
    );

    if (!updatedMarketCenter) {
      throw APIError.internal("Failed to update market center settings");
    }

    // Create history entry for the settings change
    await marketCenterRepository.createHistory({
      marketCenterId: req.marketCenterId,
      action: "UPDATE",
      field: "sponsorSlots",
      previousValue: JSON.stringify(currentSettings.sponsorSlots ?? null),
      newValue: JSON.stringify(sponsorSlots),
      changedById: userContext.userId,
    });

    return {
      sponsorSlots,
    };
  }
);

// ============================================================================
// Upload Sponsor Asset
// ============================================================================

export interface UploadSponsorAssetRequest {
  marketCenterId: string;
  slot: SponsorSlotKey;
  fileName: string;
  mimeType: string;
  content: string; // Base64 encoded file content
}

export interface UploadSponsorAssetResponse {
  imageKey: string;
  imageUrl: string;
}

/**
 * Upload a sponsor creative asset (image) for a market center's sponsor
 * slot. Only STAFF_LEADER and ADMIN can upload sponsor assets.
 */
export const uploadSponsorAsset = api<
  UploadSponsorAssetRequest,
  UploadSponsorAssetResponse
>(
  {
    expose: true,
    method: "POST",
    path: "/settings/partner-slots/:marketCenterId/asset",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();
    const isStaffLeader = userContext?.role === "STAFF_LEADER";
    const isAdmin = userContext?.role === "ADMIN";

    // Only STAFF_LEADER and ADMIN can upload sponsor assets
    if (
      !userContext?.role ||
      userContext?.role === "AGENT" ||
      userContext?.role === "STAFF"
    ) {
      throw APIError.permissionDenied(
        "Only staff leaders and administrators can upload sponsor assets"
      );
    }

    const marketCenter = await marketCenterRepository.findById(
      req.marketCenterId
    );
    if (!marketCenter) {
      throw APIError.notFound("Market center not found");
    }

    // Verify user has access to this market center
    const accessibleMarketCenterIds =
      await getAccessibleMarketCenterIds(userContext);

    let includesMarketCenterId = false;
    if (accessibleMarketCenterIds && accessibleMarketCenterIds.length > 0) {
      for (const id of accessibleMarketCenterIds) {
        if (id === req.marketCenterId) {
          includesMarketCenterId = true;
          break;
        }
      }
    }

    const marketCenterId: string | undefined =
      isAdmin && includesMarketCenterId
        ? req.marketCenterId
        : isStaffLeader && userContext?.marketCenterId === req.marketCenterId
          ? userContext.marketCenterId
          : undefined;

    if (!marketCenterId) {
      throw APIError.permissionDenied(
        "You do not have access to this market center's settings"
      );
    }

    if (!isSponsorSlotKey(req.slot)) {
      throw APIError.invalidArgument(`Unknown sponsor slot key: ${req.slot}`);
    }

    // Validate mime type
    if (!ALLOWED_SPONSOR_MIME_TYPES.includes(req.mimeType)) {
      throw APIError.invalidArgument(
        "File type not allowed. Allowed types: PNG, JPEG, WebP, GIF"
      );
    }

    // Decode base64 content and validate the DECODED size, not a claimed size
    const fileBuffer = Buffer.from(req.content, "base64");

    if (fileBuffer.length > MAX_SPONSOR_ASSET_SIZE) {
      throw APIError.invalidArgument(
        `File size exceeds maximum allowed size of ${MAX_SPONSOR_ASSET_SIZE / (1024 * 1024)}MB`
      );
    }

    // Generate a unique key for the file in the bucket, scoped to this
    // market center and slot so it can be referenced from sponsorSlots.
    const sanitizedFileName = req.fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
    const imageKey = `${req.marketCenterId}/${req.slot}/${Date.now()}_${sanitizedFileName}`;

    // Upload file to bucket
    await sponsorAssets.upload(imageKey, fileBuffer, {
      contentType: req.mimeType,
    });

    const imageUrl = sponsorAssets.publicUrl(imageKey);

    return { imageKey, imageUrl };
  }
);

// ============================================================================
// Get Sponsor Display
// ============================================================================

export interface SponsorDisplaySlot {
  slot: SponsorSlotKey;
  name?: string;
  imageUrl: string;
  linkUrl?: string;
}

export interface GetSponsorDisplayResponse {
  slots: SponsorDisplaySlot[];
}

/**
 * Get the sponsor slots to display for the current user's market center.
 * Available to any authenticated role. Never throws for a missing market
 * center, missing settings, or a user without a market center - it simply
 * returns an empty list.
 */
export const getSponsorDisplay = api<void, GetSponsorDisplayResponse>(
  {
    expose: true,
    method: "GET",
    path: "/settings/partner-display",
    auth: true,
  },
  async () => {
    const userContext = await getUserContext();

    if (!userContext?.marketCenterId) {
      return { slots: [] };
    }

    const marketCenter = await marketCenterRepository.findById(
      userContext.marketCenterId
    );

    if (!marketCenter) {
      return { slots: [] };
    }

    const sponsorSlots: SponsorSlots =
      marketCenter?.settings?.sponsorSlots ?? {};

    const slots: SponsorDisplaySlot[] = [];
    for (const key of SPONSOR_SLOT_KEYS) {
      const slot = sponsorSlots[key];
      if (!slot?.enabled || !slot.imageKey) {
        continue;
      }

      slots.push({
        slot: key,
        name: slot.name,
        imageUrl: sponsorAssets.publicUrl(slot.imageKey),
        linkUrl: slot.linkUrl,
      });
    }

    return { slots };
  }
);
