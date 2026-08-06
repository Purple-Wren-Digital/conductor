import { useAuth } from "@clerk/nextjs";
import { API_BASE } from "@/lib/api/utils";
import { useQuery } from "@tanstack/react-query";
import type { settings } from "@/lib/api/encore-client";
import { normalizeLocalAssetUrl } from "@/lib/utils";

export type SponsorDisplaySlot = settings.SponsorDisplaySlot;
export type SponsorSlotKey = settings.SponsorSlotKey;

export const sponsorDisplayKeys = {
  all: ["sponsor-display"] as const,
};

/**
 * Fetches the sponsor slots to display for the current user's market center
 * (only enabled, image-bearing slots are returned by the backend).
 */
export function useSponsorDisplay() {
  const { getToken } = useAuth();
  return useQuery<SponsorDisplaySlot[], Error>({
    queryKey: sponsorDisplayKeys.all,
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("No authentication token");
      const res = await fetch(`${API_BASE}/settings/partner-display`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to fetch sponsor display");
      const data = (await res.json()) as settings.GetSponsorDisplayResponse;
      return data.slots.map((s) => ({
        ...s,
        imageUrl: normalizeLocalAssetUrl(s.imageUrl),
      }));
    },
    staleTime: 5 * 60_000,
  });
}

/**
 * Returns the sponsor slot entry matching `slot`, or undefined when that
 * slot is not currently enabled/configured for the caller's market center.
 */
export function useSponsorSlot(
  slot: SponsorSlotKey
): SponsorDisplaySlot | undefined {
  const { data } = useSponsorDisplay();
  return data?.find((s) => s.slot === slot);
}
