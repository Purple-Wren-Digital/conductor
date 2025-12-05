"use client";

import React, { useCallback, useMemo, useState } from "react";
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
import { useFetchTicketsCreatedReport } from "@/hooks/use-reports";
import type { TicketStatus } from "@/lib/types";
import { InfoIcon } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

export const defaultCreatedTicketsByMonthValues = {
  ticketsCreated: [],
  total: 0,
};

export default function CreatedTicketsByMonthReport({
  isSelected,
}: ReportProps) {
  const [hydrated, setHydrated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [selectedStatuses, setSelectedStatuses] = useState<TicketStatus[]>([]);
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();

  const clearFilters = useCallback(() => {
    setSelectedStatuses([]);
    setDateFrom(undefined);
    setDateTo(undefined);
  }, []);
  const hasActiveFilters = useMemo(() => {
    return (
      selectedStatuses.length > 0 ||
      dateFrom !== undefined ||
      dateTo !== undefined
    );
  }, [selectedStatuses, dateFrom, dateTo]);

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (selectedStatuses.length > 0) {
      selectedStatuses.forEach((s) => params.append("status", s));
    }
    if (dateFrom) params.append("dateFrom", startOfDay(dateFrom).toISOString());
    if (dateTo) params.append("dateTo", endOfDay(dateTo).toISOString());

    return params;
  }, [selectedStatuses, dateFrom, dateTo]);

  const queryKeyParams = useMemo(
    () => Object.fromEntries(queryParams.entries()) as Record<string, string>,
    [queryParams]
  );
  const createdTicketsByMonthQueryKey = useMemo(
    () => ["created-tickets-by-month", queryKeyParams] as const,
    [queryKeyParams]
  );

  const { data: reportData } = useFetchTicketsCreatedReport({
    ticketsReportQueryKey: createdTicketsByMonthQueryKey,
    queryParams: queryParams,
    isSelected,
  });

  const totalTickets = useMemo(() => {
    return reportData?.total ? reportData.total : 0;
  }, [reportData]);
  const createdTicketsByMonth = useMemo(() => {
    if (
      !reportData ||
      !reportData?.ticketsCreated ||
      !reportData?.ticketsCreated.length
    )
      return [];
    return reportData.ticketsCreated.map((item) => ({
      label: item.createdMonthYear,
      value: item.createdCount,
    }));
  }, [reportData]);

  const createdTicketsByMonthChartConfig: ChartConfig = useMemo(() => {
    if (!createdTicketsByMonth) return {};
    return Object.fromEntries(
      createdTicketsByMonth.map((entry) => [
        entry.label,
        { label: entry.label, value: entry.value, color: "#027A48" },
      ])
    ) as ChartConfig;
  }, [createdTicketsByMonth]);

  return (
    <div className={`space-y-4 ${!isSelected ? "hidden" : ""}`}>
      <div className="flex flex-wrap justify-between items-center px-4">
        <div>
          <h2 className="text-xl font-semibold text-[#6D1C24]">
            Created Tickets By Month
          </h2>
          <p className="text-muted-foreground">
            Amount of tickets created each month
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="px-2 py-1">
            Total Tickets: {totalTickets}
          </Badge>
          <ToolTip
            trigger={<InfoIcon className="size-4.5" />}
            content={"Displays the number of tickets created each month"}
          />
        </div>
      </div>

      {/* REPORT CONTENT */}
      <ChartContainer
        config={createdTicketsByMonthChartConfig}
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
            data={createdTicketsByMonth}
            margin={{ top: 15, right: 30, left: 30, bottom: 30 }}
            aria-label="Line chart showing the amount of created tickets each month"
          >
            <CartesianGrid strokeDasharray="7 7" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: window.innerWidth < 640 ? 10 : 12 }}
              angle={window.innerWidth < 640 ? 0 : -15}
              tickMargin={10}
              tickFormatter={(value) =>
                value.length > 10 ? value.slice(0, 10) + "..." : value
              }
              aria-label="X-Axis Label: Month and Year (MM/YYYY)"
              label={{
                value: "Month and Year (MM/YYYY)",
                angle: 0,
                position: "insideBottom",
                dy: 25,
              }}
            />
            <YAxis
              dataKey="value"
              tick={{ fontSize: window.innerWidth < 640 ? 10 : 12 }}
              allowDecimals={false}
              aria-label="Y-Axis Label: Amount of Created Tickets"
              label={{
                value: "Amount of Created Tickets",
                angle: -90,
                position: "insideLeft",
                dx: 5,
              }}
            />
            <ChartTooltip
              content={<ChartTooltipContent />}
              labelFormatter={(count) => count}
            />
            <Line dataKey="value" stroke="#027A48" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
}
