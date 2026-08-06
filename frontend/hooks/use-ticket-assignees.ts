import { useAuth } from "@clerk/nextjs";
import { API_BASE } from "@/lib/api/utils";
import { useQuery } from "@tanstack/react-query";

export interface TicketAssignee {
  id: string;
  name: string | null;
  role: string;
  isActive: boolean;
}

interface TicketAssigneesResponse {
  assignees: TicketAssignee[];
}

export function useTicketAssignees(marketCenterId?: string) {
  const { getToken, isSignedIn } = useAuth();
  return useQuery<TicketAssignee[], Error>({
    queryKey: ["ticket-assignees", marketCenterId ?? "all"],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("No authentication token");
      const qp = new URLSearchParams();
      if (marketCenterId) qp.set("marketCenterId", marketCenterId);
      const res = await fetch(
        `${API_BASE}/tickets/assignees${qp.toString() ? `?${qp.toString()}` : ""}`,
        { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
      );
      if (!res.ok) throw new Error("Failed to fetch ticket assignees");
      const data = (await res.json()) as TicketAssigneesResponse;
      return data.assignees;
    },
    enabled: !!isSignedIn,
    staleTime: 60_000,
  });
}
