import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import {
  slaApi,
  SlaPolicy,
  SlaMetrics,
  SlaReportResponse,
  UpdateSlaPolicyRequest,
  SlaReportFilters,
  SlaExportResponse,
} from "@/lib/api/sla";

export const slaKeys = {
  all: ["sla"] as const,
  policies: () => [...slaKeys.all, "policies"] as const,
  metrics: (filters?: Record<string, string>) =>
    [...slaKeys.all, "metrics", filters] as const,
  report: (filters?: SlaReportFilters) =>
    [...slaKeys.all, "report", filters] as const,
};

// Hook to get SLA policies
export function useSlaPolicies() {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: slaKeys.policies(),
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      return slaApi.getPolicies(token);
    },
  });
}

// Hook to update an SLA policy
export function useUpdateSlaPolicy() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      policyId,
      data,
    }: {
      policyId: string;
      data: UpdateSlaPolicyRequest;
    }) => {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      return slaApi.updatePolicy(token, policyId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: slaKeys.policies() });
    },
  });
}

// Hook to get SLA metrics
export function useSlaMetrics(filters?: {
  dateFrom?: string;
  dateTo?: string;
  assigneeId?: string;
  categoryId?: string;
}) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: slaKeys.metrics(filters),
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      return slaApi.getMetrics(token, filters);
    },
  });
}

// Hook to get full SLA report
export function useSlaReport(filters?: SlaReportFilters) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: slaKeys.report(filters),
    queryFn: async () => {
      try {
        const token = await getToken();
        if (!token) throw new Error("Not authenticated");
        const data = await slaApi.getReport(token, filters);
        if (!data || !data.metrics) {
          throw new Error("Invalid SLA report data");
        }
        return data;
      } catch (error) {
        console.error("Error fetching SLA report:", error);
        return {
          metrics: null,
          byUrgency: [],
          byAssignee: [],
          trends: [],
          resolutionMetrics: null,
          resolutionByUrgency: [],
          resolutionTrends: [],
        };
      }
    },
  });
}

// Hook to export SLA report
export function useExportSlaReport() {
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async (filters?: { dateFrom?: string; dateTo?: string }) => {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      return slaApi.exportReport(token, filters);
    },
    onSuccess: (data: SlaExportResponse) => {
      // Trigger download
      const blob = new Blob([data.csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    },
  });
}
