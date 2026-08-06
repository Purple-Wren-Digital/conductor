import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { API_BASE } from "@/lib/api/utils";
import type { settings } from "@/lib/api/encore-client";

// =============================================================================
// TYPES (re-exported from the generated Encore client, not redeclared)
// =============================================================================

export type SponsorSlotKey = settings.SponsorSlotKey;
export type SponsorSlot = settings.SponsorSlot;
export type SponsorSlots = settings.SponsorSlots;
export type SponsorSlotWithUrl = settings.SponsorSlotWithUrl;
export type SponsorSlotsWithUrls = settings.SponsorSlotsWithUrls;
export type GetSponsorSlotsResponse = settings.GetSponsorSlotsResponse;
export type UpdateSponsorSlotsRequest = settings.UpdateSponsorSlotsRequest;
export type UpdateSponsorSlotsResponse = settings.UpdateSponsorSlotsResponse;
export type UploadSponsorAssetResponse = settings.UploadSponsorAssetResponse;

// =============================================================================
// QUERY KEYS
// =============================================================================

export const sponsorSlotsKeys = {
  all: ["settings", "sponsor-slots"] as const,
  detail: (marketCenterId?: string) =>
    [...sponsorSlotsKeys.all, marketCenterId] as const,
};

// =============================================================================
// useSponsorSlots
// =============================================================================

export function useSponsorSlots(marketCenterId: string | undefined) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: sponsorSlotsKeys.detail(marketCenterId),
    queryFn: async () => {
      if (!marketCenterId) {
        throw new Error("Market center ID is required");
      }

      const token = await getToken();
      if (!token) {
        throw new Error("Failed to get authentication token");
      }

      const response = await fetch(
        `${API_BASE}/settings/partner-slots/${marketCenterId}`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch sponsor slots");
      }

      return (await response.json()) as settings.GetSponsorSlotsResponse;
    },
    enabled: !!marketCenterId,
  });
}

// =============================================================================
// useUpdateSponsorSlots
// =============================================================================

interface UpdateSponsorSlotsInput {
  marketCenterId: string;
  sponsorSlots: settings.SponsorSlots;
}

export function useUpdateSponsorSlots() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      marketCenterId,
      sponsorSlots,
    }: UpdateSponsorSlotsInput) => {
      const token = await getToken();
      if (!token) {
        throw new Error("Failed to get authentication token");
      }

      const response = await fetch(
        `${API_BASE}/settings/partner-slots/${marketCenterId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ sponsorSlots }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update sponsor slots");
      }

      return (await response.json()) as settings.UpdateSponsorSlotsResponse;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: sponsorSlotsKeys.detail(variables.marketCenterId),
      });
    },
  });
}

// =============================================================================
// useUploadSponsorAsset
// =============================================================================

interface UploadSponsorAssetInput {
  marketCenterId: string;
  slot: settings.SponsorSlotKey;
  fileName: string;
  mimeType: string;
  content: string;
}

export function useUploadSponsorAsset() {
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async ({
      marketCenterId,
      slot,
      fileName,
      mimeType,
      content,
    }: UploadSponsorAssetInput) => {
      const token = await getToken();
      if (!token) {
        throw new Error("Failed to get authentication token");
      }

      const response = await fetch(
        `${API_BASE}/settings/partner-slots/${marketCenterId}/asset`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ slot, fileName, mimeType, content }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to upload sponsor asset");
      }

      return (await response.json()) as settings.UploadSponsorAssetResponse;
    },
  });
}
