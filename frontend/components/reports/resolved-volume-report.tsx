"use client";

import React, { useMemo } from "react";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Badge } from "@/components/ui/badge";
import { ReportProps } from "@/components/reports/reports-dashboard";
import { ToolTip } from "@/components/ui/tooltip/tooltip";
import { startOfDay, endOfDay } from "date-fns";
import { useFetchTicketsResolvedReport } from "../../hooks/use-reports";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

import { InfoIcon } from "lucide-react";

export const defaultResolvedTicketsByMonthValues = {
  ticketsResolved: [],
  total: 0,
  granularity: "monthly" as const,
};

export default function ResolvedTicketsByMonthReport({
  isSelected,
  filters,
}: ReportProps) {
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();

    if (filters.dateFrom) params.append("dateFrom", startOfDay(filters.dateFrom).toISOString());
    if (filters.dateTo) params.append("dateTo", endOfDay(filters.dateTo).toISOString());
    if (filters.marketCenterIds.length > 0) {
      filters.marketCenterIds.forEach((id) => params.append("marketCenterIds", id));
    }
    if (filters.categoryIds.length > 0) {
      filters.categoryIds.forEach((id) => params.append("categoryIds", id));
    }

    return params;
  }, [filters.dateFrom, filters.dateTo, filters.marketCenterIds, filters.categoryIds]);

  const queryKeyParams = useMemo(
    () => Object.fromEntries(queryParams.entries()) as Record<string, string>,
    [queryParams]
  );
  const resolvedTicketsQueryKey = useMemo(
    () => ["resolved-tickets-by-period", queryKeyParams] as const,
    [queryKeyParams]
  );

  const { data: reportData } = useFetchTicketsResolvedReport({
    ticketsReportQueryKey: resolvedTicketsQueryKey,
    queryParams: queryParams,
    isSelected,
  });

  const granularity = reportData?.granularity || "monthly";

  const totalTickets = useMemo(() => {
    return reportData?.total ? reportData.total : 0;
  }, [reportData]);

  const resolvedTicketsData = useMemo(() => {
    if (
      !reportData ||
      !reportData?.ticketsResolved ||
      !reportData?.ticketsResolved.length
    )
      return [];
    return reportData.ticketsResolved.map((item) => ({
      label: item.period,
      value: item.resolvedCount,
    }));
  }, [reportData]);

  const resolvedTicketsChartConfig: ChartConfig = useMemo(() => {
    if (!resolvedTicketsData) return {};
    return Object.fromEntries(
      resolvedTicketsData.map((entry) => [
        entry.label,
        { label: entry.label, value: entry.value, color: "#6D1C24" },
      ])
    ) as ChartConfig;
  }, [resolvedTicketsData]);

  // Dynamic labels based on granularity
  const getXAxisLabel = () => {
    switch (granularity) {
      case "daily":
        return "Date";
      case "weekly":
        return "Week";
      case "monthly":
      default:
        return "Month";
    }
  };

  const getReportTitle = () => {
    switch (granularity) {
      case "daily":
        return "Resolved Tickets By Day";
      case "weekly":
        return "Resolved Tickets By Week";
      case "monthly":
      default:
        return "Resolved Tickets By Month";
    }
  };

  const getReportDescription = () => {
    switch (granularity) {
      case "daily":
        return "Amount of tickets resolved each day";
      case "weekly":
        return "Amount of tickets resolved each week";
      case "monthly":
      default:
        return "Amount of tickets resolved each month";
    }
  };

  return (
    <div className={`space-y-4 ${!isSelected ? "hidden" : ""}`}>
      <div className="flex flex-wrap justify-between items-center px-4">
        <div>
          <h2 className="text-xl font-semibold text-[#6D1C24]">
            {getReportTitle()}
          </h2>
          <p className="text-muted-foreground">
            {getReportDescription()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="px-2 py-1">
            Total Tickets: {totalTickets}
          </Badge>
          <ToolTip
            trigger={<InfoIcon className="size-4.5" />}
            content={`Displays the number of tickets resolved. Granularity auto-adjusts: daily (≤31 days), weekly (32-90 days), monthly (>90 days).`}
          />
        </div>
      </div>

      {/* REPORT CONTENT */}
      <ChartContainer
        config={resolvedTicketsChartConfig}
        className="w-[99%] md:w-full "
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            style={{
              width: "100%",
              height: "100%",
              margin: "0",
              padding: "0",
              aspectRatio: 1.618,
            }}
            data={resolvedTicketsData}
            margin={{ top: 15, right: 30, left: 30, bottom: 30 }}
            aria-label={`Line chart showing the amount of resolved tickets by ${granularity}`}
          >
            <CartesianGrid strokeDasharray="7 7" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: window.innerWidth < 640 ? 10 : 12 }}
              angle={granularity === "daily" ? -45 : -15}
              tickMargin={10}
              tickFormatter={(value) =>
                value.length > 12 ? value.slice(0, 12) + "..." : value
              }
              aria-label={`X-Axis Label: ${getXAxisLabel()}`}
              label={{
                value: getXAxisLabel(),
                angle: 0,
                position: "insideBottom",
                dy: 25,
              }}
            />
            <YAxis
              dataKey={"value"}
              tick={{ fontSize: window.innerWidth < 640 ? 10 : 12 }}
              allowDecimals={false}
              aria-label="Y-Axis Label: Amount of Resolved Tickets"
              label={{
                value: "Amount of Resolved Tickets",
                angle: -90,
                position: "insideLeft",
                dx: 5,
              }}
            />
            <ChartTooltip
              content={<ChartTooltipContent />}
              labelFormatter={(count) => count}
            />
            <Line dataKey="value" stroke="#6D1C24" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
}
