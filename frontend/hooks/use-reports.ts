import { useAuth } from "@clerk/nextjs";
import { API_BASE } from "@/lib/api/utils";
import type { Ticket, TicketsResponse } from "@/lib/types";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { reportDefaultValues } from "@/components/reports/sla-compliance-report";
import { backlogDefaultValues } from "@/components/reports/backlog-report";
import { defaultResolvedTicketsByMonthValues } from "@/components/reports/resolved-volume-report";
import { defaultCreatedTicketsByMonthValues } from "@/components/reports/created-volume-report";
import { complianceByUsersDefaultValues } from "@/components/reports/users-tickets-overdue-at-risk";

type UserSLAStats = {
  id: string;
  name: string;
  atRisk: number;
  overdue: number;
  ticketTotal: number;
};

// SLA Compliance - Resolved Ticket by Compliance Status
export function useFetchSlaComplianceReport({
  ticketsReportQueryKey,
  queryParams,
  isSelected,
}: {
  ticketsReportQueryKey: readonly [string, Record<string, string>];
  queryParams: URLSearchParams;
  isSelected: boolean;
}) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ticketsReportQueryKey,
    queryFn: async (): Promise<{
      compliant: number;
      onTrack: number;
      atRisk: number;
      overdue: number;
    }> => {
      try {
        const token = await getToken();
        if (!token) {
          throw new Error("Failed to get authentication token");
        }

        const res = await fetch(
          `${API_BASE}/reports/sla-compliance${queryParams ? `?${queryParams.toString()}` : ""}`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
          }
        );
        if (!res.ok) throw new Error("Failed to fetch SLA compliance report");
        const data = await res.json();
        return data;
      } catch (error) {
        console.error("Failed to fetch SLA compliance report", error);
        return reportDefaultValues;
      }
    },
    enabled: !!isSelected,
    placeholderData: keepPreviousData,
  });
}

// SLA Compliance - Resolved Ticket by Compliance Status
export function useFetchSlaComplianceByUsersReport({
  ticketsReportQueryKey,
  queryParams,
  isSelected,
}: {
  ticketsReportQueryKey: readonly [string, Record<string, string>];
  queryParams: URLSearchParams;
  isSelected: boolean;
}) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ticketsReportQueryKey,
    queryFn: async (): Promise<{
      assignees: UserSLAStats[];
      ticketTotal: number;
      assigneeTotal: number;
    }> => {
      try {
        const token = await getToken();
        if (!token) {
          throw new Error("Failed to get authentication token");
        }

        const res = await fetch(
          `${API_BASE}/reports/sla-compliance-by-users${queryParams ? `?${queryParams.toString()}` : ""}`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
          }
        );
        if (!res.ok)
          throw new Error(
            "Failed to fetch SLA compliance By Ticket Assignees report"
          );
        const data = await res.json();
        return data;
      } catch (error) {
        console.error(
          "Failed to fetch SLA compliance By Ticket Assignees report",
          error
        );
        return complianceByUsersDefaultValues;
      }
    },
    enabled: !!isSelected,
    placeholderData: keepPreviousData,
  });
}

// Tickets Backlog
export function useFetchTicketBacklogReport({
  ticketsReportQueryKey,
  queryParams,
  isSelected,
}: {
  ticketsReportQueryKey: readonly [string, Record<string, string>];
  queryParams: URLSearchParams;
  isSelected: boolean;
}) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ticketsReportQueryKey,
    queryFn: async (): Promise<{
      created: number;
      unassigned: number;
      total: number;
    }> => {
      if (!isSelected) return backlogDefaultValues;
      try {
        const token = await getToken();
        if (!token) {
          throw new Error("Failed to get authentication token");
        }

        const res = await fetch(
          `${API_BASE}/reports/ticket-backlog${queryParams ? `?${queryParams.toString()}` : ""}`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
          }
        );
        if (!res.ok) throw new Error("Failed to fetch tickets backlog");
        const data = await res.json();
        return data;
      } catch (error) {
        console.error("Failed to fetch tickets backlog report", error);
        return backlogDefaultValues;
      }
    },
    enabled: !!isSelected,
    placeholderData: keepPreviousData,
  });
}

export type Granularity = "daily" | "weekly" | "monthly";

// Created Tickets by Period (auto-adjusts granularity based on date range)
export function useFetchTicketsCreatedReport({
  ticketsReportQueryKey,
  queryParams,
  isSelected,
}: {
  ticketsReportQueryKey: readonly [string, Record<string, string>];
  queryParams: URLSearchParams;
  isSelected: boolean;
}) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ticketsReportQueryKey,
    queryFn: async (): Promise<{
      ticketsCreated: {
        period: string;
        createdCount: number;
      }[];
      total: number;
      granularity: Granularity;
    }> => {
      if (!queryParams) {
        return defaultCreatedTicketsByMonthValues;
      }
      try {
        const token = await getToken();
        if (!token) {
          throw new Error("Failed to get authentication token");
        }

        const res = await fetch(
          `${API_BASE}/reports/created-by-month${queryParams ? `?${queryParams.toString()}` : ""}`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
          }
        );
        if (!res.ok) throw new Error("Failed to fetch tickets");
        const data = await res.json();
        return data;
      } catch (error) {
        console.error("Failed to fetch tickets created by month report", error);
        return defaultCreatedTicketsByMonthValues;
      }
    },
    enabled: !!isSelected,
    placeholderData: keepPreviousData,
  });
}

// Resolved Tickets by Period (auto-adjusts granularity based on date range)
export function useFetchTicketsResolvedReport({
  ticketsReportQueryKey,
  queryParams,
  isSelected,
}: {
  ticketsReportQueryKey: readonly [string, Record<string, string>];
  queryParams: URLSearchParams;
  isSelected: boolean;
}) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ticketsReportQueryKey,
    queryFn: async (): Promise<{
      ticketsResolved: {
        period: string;
        resolvedCount: number;
      }[];
      total: number;
      granularity: Granularity;
    }> => {
      if (!queryParams) {
        return defaultResolvedTicketsByMonthValues;
      }
      try {
        const token = await getToken();
        if (!token) {
          throw new Error("Failed to get authentication token");
        }

        const res = await fetch(
          `${API_BASE}/reports/resolved-by-month${queryParams ? `?${queryParams.toString()}` : ""}`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
          }
        );
        if (!res.ok) throw new Error("Failed to fetch tickets");
        const data = await res.json();
        return data;
      } catch (error) {
        console.error(
          "Failed to fetch tickets resolved by month report",
          error
        );
        return defaultResolvedTicketsByMonthValues;
      }
    },
    enabled: !!isSelected,
    placeholderData: keepPreviousData,
  });
}
