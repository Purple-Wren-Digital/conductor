import { API_BASE } from "@/lib/api/utils";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import type { UserRole } from "@/lib/types";

export interface FetchAllTemplates {
  role?: UserRole;
  queryKey: readonly [string];
}

export function useFetchAllTemplatesQuery({
  role,
  queryKey,
}: FetchAllTemplates) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: queryKey,
    queryFn: async () => {
      if (role !== "ADMIN") {
        throw new Error("Unauthorized: Admins only");
      }
      try {
        const token = await getToken();
        if (!token) throw new Error("Failed to get authentication token");

        const response = await fetch(`${API_BASE}/notifications/templates`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) throw new Error("Failed to fetch templates");
        const data = await response.json();
        return data?.templates;
      } catch (error) {
        console.error("Error fetching templates:", error);
        throw error;
      }
    },
    enabled: !!role && role === "ADMIN",
  });
}
