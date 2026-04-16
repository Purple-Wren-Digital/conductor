import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { useStore } from "@/context/store-provider";
import { API_BASE } from "@/lib/api/utils";
import type { ConductorUser } from "@/lib/types";
import { toast } from "sonner";

export function useSwitchMarketCenter() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const { currentUser, setCurrentUser } = useStore();

  return useMutation({
    mutationFn: async (marketCenterId: string) => {
      const token = await getToken();
      if (!token) throw new Error("Failed to get authentication token");

      const response = await fetch(
        `${API_BASE}/users/me/switch-market-center`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ marketCenterId }),
        }
      );

      if (!response.ok) throw new Error("Failed to switch market center");
      return response.json() as Promise<{
        marketCenterId: string;
        marketCenter: { id: string; name: string };
      }>;
    },
    onSuccess: (data) => {
      // Update store immediately for instant UI feedback
      if (currentUser) {
        setCurrentUser({
          ...currentUser,
          marketCenterId: data.marketCenterId,
          marketCenter: data.marketCenter as ConductorUser["marketCenter"],
        });
      }

      // Invalidate all queries to refetch data scoped to the new MC
      queryClient.invalidateQueries();

      toast.success(`Switched to ${data.marketCenter.name}`);
    },
    onError: () => {
      toast.error("Failed to switch market center");
    },
  });
}
