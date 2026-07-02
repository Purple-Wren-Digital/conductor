import { useAuth } from "@clerk/nextjs";
import { API_BASE } from "@/lib/api/utils";
import { useQuery } from "@tanstack/react-query";
import type { TicketStatus, Urgency } from "@/lib/types";

export interface DashboardMetricsResponse {
  totalTickets: number;
  openTickets: number;
  overdueTickets: number;
  highPriorityOpen: number;
  unassignedOpen: number;
  createdLast7Days: number;
  resolvedLast7Days: number;
  avgResponseTime: number;
  ticketsByStatus: Record<TicketStatus, number>;
  ticketsByUrgency: Record<Urgency, number>;
}

export function useDashboardMetrics(marketCenterId?: string) {
  const { getToken } = useAuth();
  return useQuery<DashboardMetricsResponse, Error>({
    queryKey: ["dashboard-metrics", marketCenterId ?? "all"],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("No authentication token");
      const qp = new URLSearchParams();
      if (marketCenterId) qp.set("marketCenterId", marketCenterId);
      const res = await fetch(
        `${API_BASE}/dashboard/metrics${qp.toString() ? `?${qp.toString()}` : ""}`,
        { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
      );
      if (!res.ok) throw new Error("Failed to fetch dashboard metrics");
      const data = (await res.json()) as { metrics: DashboardMetricsResponse };
      return data.metrics;
    },
    staleTime: 60_000,
  });
}
