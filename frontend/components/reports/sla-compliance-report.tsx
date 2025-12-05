"use client";

import React, { useCallback, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { ReportProps } from "@/components/reports/reports-dashboard";
import { useFetchSlaComplianceReport } from "@/hooks/use-reports";
import type { TicketStatus } from "@/lib/types";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { InfoIcon } from "lucide-react";
import { ToolTip } from "../ui/tooltip/tooltip";

export const reportDefaultValues = {
  compliant: 0,
  onTrack: 0,
  atRisk: 0,
  overdue: 0,
};

export default function SlaComplianceReport({ isSelected }: ReportProps) {
  // const [hydrated, setHydrated] = useState(false);
  // const [isLoading, setIsLoading] = useState(false);
  // const [showFilters, setShowFilters] = useState(true);

  const [selectedMarketCenterIds, setSelectedMarketCenterIds] = useState([]);
  const [selectedStatuses, setSelectedStatuses] = useState<TicketStatus[]>([]);
  const [selectedCategories, setSelectedCategories] = useState([]);

  const clearFilters = useCallback(() => {
    setSelectedStatuses([]);
    setSelectedMarketCenterIds([]);
    setSelectedCategories([]);
  }, []);
  const hasActiveFilters = useMemo(() => {
    return (
      selectedMarketCenterIds.length > 0 ||
      selectedStatuses.length > 0 ||
      selectedCategories.length > 0
    );
  }, [selectedMarketCenterIds, selectedStatuses, selectedCategories]);

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (selectedStatuses.length > 0) {
      selectedStatuses.forEach((s) => params.append("status", s));
    }
    if (selectedMarketCenterIds.length > 0) {
      selectedMarketCenterIds.forEach((id) =>
        params.append("marketCenterId", id)
      );
    }
    if (selectedCategories.length > 0) {
      selectedCategories.forEach((id) => params.append("categoryId", id));
    }

    return params;
  }, [selectedStatuses, selectedMarketCenterIds, selectedCategories]);

  const queryKeyParams = useMemo(
    () => Object.fromEntries(queryParams.entries()) as Record<string, string>,
    [queryParams]
  );
  const slaReportQueryKey = useMemo(
    () => ["sla-compliance-report", queryKeyParams] as const,
    [queryKeyParams]
  );

  const { data: reportData } = useFetchSlaComplianceReport({
    ticketsReportQueryKey: slaReportQueryKey,
    queryParams: queryParams,
    isSelected,
  });

  const totalTickets = useMemo(() => {
    return (
      (reportData?.compliant ?? 0) +
      (reportData?.onTrack ?? 0) +
      (reportData?.atRisk ?? 0) +
      (reportData?.overdue ?? 0)
    );
  }, [reportData]);

  const ticketsBySlaStatus = useMemo(() => {
    return [
      { label: "Compliant", value: reportData?.compliant ?? 0 },
      { label: "On Track", value: reportData?.onTrack ?? 0 },
      { label: "At Risk", value: reportData?.atRisk ?? 0 },
      { label: "Overdue", value: reportData?.overdue ?? 0 },
    ];
  }, [reportData]);

  const slaComplianceChartConfig: ChartConfig = useMemo(() => {
    if (!ticketsBySlaStatus) return {};
    return Object.fromEntries(
      ticketsBySlaStatus.map((entry) => [
        entry.label,
        { label: entry.label, value: entry.value, color: "#6D1C24" },
      ])
    ) as ChartConfig;
  }, [ticketsBySlaStatus]);

  return (
    <div className={`space-y-4 ${!isSelected ? "hidden" : ""}`}>
      <div className="flex flex-wrap justify-between items-center px-4">
        <div>
          <h2 className="text-xl font-semibold text-[#6D1C24]">
            SLA Compliance: Overview
          </h2>
          <p>Determined by a ticket's status and due date</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="px-2 py-1">
            Total Tickets: {totalTickets}
          </Badge>
          <ToolTip
            trigger={<InfoIcon className="size-4.5" />}
            content={`If no due date is provided, expected resolution time is 2 weeks from the created date. At-risk tickets are tickets due within 6 hours that are not yet resolved.`}
          />
        </div>
      </div>

      {/* REPORT CONTENT */}
      <ChartContainer
        config={slaComplianceChartConfig}
        className="w-[99%] md:w-full "
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={ticketsBySlaStatus}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            barSize={75}
            aria-label="Bar chart showing the amount of tickets by their SLA compliance status"
          >
            <CartesianGrid strokeDasharray="7 7" />
            <XAxis
              dataKey="label"
              aria-label="X-Axis Label: Compliance Status"
              label={{
                value: "Compliance Status",
                angle: 0,
                position: "insideBottom",
                dy: 10,
              }}
            />
            <YAxis
              dataKey="value"
              aria-label="Y-Axis Label: Amount of Tickets"
              label={{
                value: "Amount of Tickets",
                angle: -90,
                position: "insideLeft",
                dx: 5,
              }}
            />
            <ChartTooltip
              content={<ChartTooltipContent />}
              labelFormatter={(value) => value}
            />
            <Bar dataKey="value" isAnimationActive={true} radius={[4, 4, 0, 0]}>
              {ticketsBySlaStatus.map((entry, i) => (
                <Cell
                  key={`status-cell-${i}`}
                  fill="#6D1C24"
                  stroke="#4B1D22"
                  strokeWidth={0.75}
                />
              ))}
              <LabelList
                dataKey="value"
                position="top"
                formatter={(value: number) => (value ?? 0).toString()}
                className="fill-foreground rounded-md"
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
}
