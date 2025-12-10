import { clientSideEnv } from "@/lib/env/client-side";
import { Environment, Local, PreviewEnv } from "./encore-client";

// Types
export type Urgency = "HIGH" | "MEDIUM" | "LOW";

export interface SlaPolicy {
  id: string;
  urgency: Urgency;
  responseTimeMinutes: number;
  resolutionTimeMinutes: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SlaPoliciesResponse {
  policies: SlaPolicy[];
}

export interface UpdateSlaPolicyRequest {
  responseTimeMinutes?: number;
  resolutionTimeMinutes?: number;
  isActive?: boolean;
}

export interface SlaMetrics {
  totalTickets: number;
  ticketsWithSla: number;
  ticketsMet: number;
  ticketsBreached: number;
  complianceRate: number;
  avgResponseTimeMinutes: number | null;
}

export interface ResolutionSlaMetrics {
  totalTickets: number;
  ticketsWithSla: number;
  ticketsMet: number;
  ticketsBreached: number;
  complianceRate: number;
  avgResolutionTimeMinutes: number | null;
}

export interface SlaMetricsByUrgency {
  urgency: Urgency;
  totalTickets: number;
  ticketsMet: number;
  ticketsBreached: number;
  complianceRate: number;
}

export interface SlaMetricsByAssignee {
  assigneeId: string | null;
  assigneeName: string | null;
  totalTickets: number;
  ticketsMet: number;
  ticketsBreached: number;
  complianceRate: number;
  avgResponseTimeMinutes: number | null;
}

export interface SlaTrend {
  period: string;
  totalTickets: number;
  ticketsMet: number;
  ticketsBreached: number;
  complianceRate: number;
}

export interface SlaReportResponse {
  // Response SLA
  metrics: SlaMetrics;
  byUrgency: SlaMetricsByUrgency[];
  byAssignee: SlaMetricsByAssignee[];
  trends: SlaTrend[];
  // Resolution SLA
  resolutionMetrics: ResolutionSlaMetrics;
  resolutionByUrgency: SlaMetricsByUrgency[];
  resolutionTrends: SlaTrend[];
}

export interface SlaReportFilters {
  dateFrom?: string;
  dateTo?: string;
  groupBy?: "day" | "week" | "month";
}

export interface SlaExportResponse {
  csv: string;
  filename: string;
}

// Get the correct encore environment
let environment = Local;
if (process.env.NEXT_PUBLIC_API_URL) {
  environment = process.env.NEXT_PUBLIC_API_URL as typeof Local;
} else if (clientSideEnv.NEXT_PUBLIC_VERCEL_ENV === "production") {
  environment = Environment("staging");
} else if (clientSideEnv.NEXT_PUBLIC_VERCEL_ENV === "preview") {
  if (!clientSideEnv.NEXT_PUBLIC_VERCEL_GIT_PULL_REQUEST_ID) {
    throw new Error("NEXT_PUBLIC_VERCEL_GIT_PULL_REQUEST_ID is not set");
  }
  environment = PreviewEnv(
    clientSideEnv.NEXT_PUBLIC_VERCEL_GIT_PULL_REQUEST_ID
  );
}

async function fetchApi<T>(
  path: string,
  token: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${environment}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API Error: ${response.status} - ${error}`);
  }

  return response.json();
}

export const slaApi = {
  // Get all SLA policies
  getPolicies: async (token: string): Promise<SlaPoliciesResponse> => {
    return fetchApi<SlaPoliciesResponse>("/sla/policies", token);
  },

  // Update an SLA policy
  updatePolicy: async (
    token: string,
    policyId: string,
    data: UpdateSlaPolicyRequest
  ): Promise<{ policy: SlaPolicy }> => {
    return fetchApi<{ policy: SlaPolicy }>(`/sla/policies/${policyId}`, token, {
      method: "PUT",
      body: JSON.stringify({ id: policyId, ...data }),
    });
  },

  // Get SLA metrics summary
  getMetrics: async (
    token: string,
    filters?: {
      dateFrom?: string;
      dateTo?: string;
      assigneeId?: string;
      categoryId?: string;
    }
  ): Promise<{ metrics: SlaMetrics }> => {
    const params = new URLSearchParams();
    if (filters?.dateFrom) params.append("dateFrom", filters.dateFrom);
    if (filters?.dateTo) params.append("dateTo", filters.dateTo);
    if (filters?.assigneeId) params.append("assigneeId", filters.assigneeId);
    if (filters?.categoryId) params.append("categoryId", filters.categoryId);

    const query = params.toString();
    return fetchApi<{ metrics: SlaMetrics }>(
      `/sla/metrics${query ? `?${query}` : ""}`,
      token
    );
  },

  // Get full SLA report
  getReport: async (
    token: string,
    filters?: SlaReportFilters
  ): Promise<SlaReportResponse> => {
    const params = new URLSearchParams();
    if (filters?.dateFrom) params.append("dateFrom", filters.dateFrom);
    if (filters?.dateTo) params.append("dateTo", filters.dateTo);
    if (filters?.groupBy) params.append("groupBy", filters.groupBy);

    const query = params.toString();
    return fetchApi<SlaReportResponse>(
      `/sla/reports${query ? `?${query}` : ""}`,
      token
    );
  },

  // Export SLA report as CSV
  exportReport: async (
    token: string,
    filters?: { dateFrom?: string; dateTo?: string }
  ): Promise<SlaExportResponse> => {
    const params = new URLSearchParams();
    if (filters?.dateFrom) params.append("dateFrom", filters.dateFrom);
    if (filters?.dateTo) params.append("dateTo", filters.dateTo);

    const query = params.toString();
    return fetchApi<SlaExportResponse>(
      `/sla/reports/export${query ? `?${query}` : ""}`,
      token
    );
  },
};

// Helper function to format minutes into human-readable duration
export function formatSlaDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours} hour${hours !== 1 ? "s" : ""}`;
  }
  return `${hours}h ${remainingMinutes}m`;
}

// Helper to get urgency color
export function getUrgencyColor(urgency: Urgency): string {
  switch (urgency) {
    case "HIGH":
      return "text-red-600 bg-red-50";
    case "MEDIUM":
      return "text-yellow-600 bg-yellow-50";
    case "LOW":
      return "text-green-600 bg-green-50";
    default:
      return "text-gray-600 bg-gray-50";
  }
}

// Helper to get compliance color based on percentage
export function getComplianceColor(rate: number): string {
  if (rate >= 90) return "text-green-600";
  if (rate >= 75) return "text-yellow-600";
  return "text-red-600";
}
