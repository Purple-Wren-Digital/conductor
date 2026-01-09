"use client";

import React, { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { ReportProps } from "@/components/reports/reports-dashboard";
import { ToolTip } from "@/components/ui/tooltip/tooltip";
import { useFetchTicketBacklogReport } from "@/hooks/use-reports";
import { startOfDay, endOfDay } from "date-fns";
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

export const backlogDefaultValues = { created: 0, unassigned: 0, total: 0 };

export default function TicketBacklogReport({ isSelected, filters }: ReportProps) {
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.dateFrom) params.append("dateFrom", startOfDay(filters.dateFrom).toISOString());
    if (filters.dateTo) params.append("dateTo", endOfDay(filters.dateTo).toISOString());
    if (filters.marketCenterIds.length > 0) {
      filters.marketCenterIds.forEach((id) =>
        params.append("marketCenterIds", id)
      );
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
  const backlogReportQueryKey = useMemo(
    () => ["ticket-backlog-report", queryKeyParams] as const,
    [queryKeyParams]
  );

  const { data: reportData } = useFetchTicketBacklogReport({
    ticketsReportQueryKey: backlogReportQueryKey,
    queryParams: queryParams,
    isSelected,
  });

  const ticketsByStatus = useMemo(() => {
    if (!reportData) return [];
    return [
      {
        label: "Unchanged",
        value: reportData?.created ?? 0,
      },
      {
        label: "Unassigned",
        value: reportData?.unassigned ?? 0,
      },
    ];
  }, [reportData]);

  const totalTickets = useMemo(() => {
    return reportData?.total ? reportData.total : 0;
  }, [reportData]);

  const ticketsBacklogChartConfig: ChartConfig = useMemo(() => {
    if (!ticketsByStatus) return {};
    return Object.fromEntries(
      ticketsByStatus.map((entry) => [
        "Tickets Backlog",
        { label: entry.label, value: entry.value, color: "#6D1C24" },
      ])
    ) as ChartConfig;
  }, [ticketsByStatus]);

  return (
    <div className={`space-y-4 ${!isSelected ? "hidden" : ""}`}>
      <div className="flex flex-wrap justify-between items-center px-4">
        <div>
          <h2 className="text-xl font-semibold text-[#6D1C24]">
            Ticket Backlog Report
          </h2>
          <p className="text-muted-foreground">
            Backlog of tickets without updates and without an assignee
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="px-2 py-1">
            Total Tickets: {totalTickets}
          </Badge>
          <ToolTip
            trigger={<InfoIcon className="size-4.5" />}
            content={
              "Unchanged: Tickets assigned but never updated\nUnassigned: Tickets with no staff member assigned"
            }
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-3 justify-center mt-5">
        {ticketsByStatus.map((item) => (
          <div
            key={`backlog-${item.label}`}
            className="flex items-center gap-1"
          >
            <span className="text-sm">
              <span className="font-semibold">{item.label}:</span>{" "}
              {item.value ?? 0}
            </span>
          </div>
        ))}
      </div>
      <ChartContainer
        config={ticketsBacklogChartConfig}
        className="w-[99%] md:w-full"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={ticketsByStatus}
            margin={{ top: 15, right: 30, left: 20, bottom: 20 }}
            barSize={75}
            aria-label="Bar chart showing the amount of tickets that are unchanged and unassigned"
          >
            <CartesianGrid strokeDasharray="7 7" />
            <XAxis
              dataKey="label"
              aria-label="X-Axis Label: Ticket Status"
              label={{
                value: "Ticket Status",
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
              {ticketsByStatus.map((entry, i) => (
                <Cell
                  key={`backlog-cell-${i}`}
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
