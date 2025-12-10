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
import { useFetchSlaComplianceByUsersReport } from "@/hooks/use-reports";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { InfoIcon } from "lucide-react";
import { ToolTip } from "../ui/tooltip/tooltip";

export const complianceByUsersDefaultValues = {
  assignees: [],
  ticketTotal: 0,
  assigneeTotal: 0,
};

export default function SlaComplianceByUsersReport({
  isSelected,
  filters,
}: ReportProps) {
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    // SLA reports don't use date filtering - they show current compliance status
    if (filters.marketCenterIds.length > 0) {
      filters.marketCenterIds.forEach((id) =>
        params.append("marketCenterIds", id)
      );
    }
    if (filters.categoryIds.length > 0) {
      filters.categoryIds.forEach((id) => params.append("categoryIds", id));
    }

    return params;
  }, [filters.marketCenterIds, filters.categoryIds]);

  const queryKeyParams = useMemo(
    () => Object.fromEntries(queryParams.entries()) as Record<string, string>,
    [queryParams]
  );
  const slaReportByUsersQueryKey = useMemo(
    () => ["sla-compliance-by-users-report", queryKeyParams] as const,
    [queryKeyParams]
  );

  const { data: reportData } = useFetchSlaComplianceByUsersReport({
    ticketsReportQueryKey: slaReportByUsersQueryKey,
    queryParams: queryParams,
    isSelected,
  });

  const totalTickets = useMemo(() => {
    return reportData?.ticketTotal ?? 0;
  }, [reportData]);

  const totalAssignees = useMemo(() => {
    return reportData?.assigneeTotal ?? 0;
  }, [reportData]);

  const slaByUsers = useMemo(() => {
    return (
      reportData?.assignees.map((assignee) => ({
        id: assignee.id,
        label: assignee.name,
        value: assignee.ticketTotal,

        atRiskLabel: "At Risk",
        atRiskValue: assignee.atRisk,

        overdueLabel: "Overdue",
        overdueValue: assignee.overdue,
      })) || []
    );
  }, [reportData]);

  const slaComplianceByUsersChartConfig: ChartConfig = useMemo(() => {
    if (!slaByUsers) return {};
    return Object.fromEntries(
      slaByUsers.map((entry) => [
        entry.label, //user name
        {
          label: entry.label,
          value: entry.value,
          atRiskValue: 3, //entry.atRiskValue,
          overdueValue: entry.overdueValue,
        },
      ])
    ) as ChartConfig;
  }, [slaByUsers]);

  return (
    <div className={`space-y-4 ${!isSelected ? "hidden" : ""}`}>
      <div className="flex flex-wrap justify-between items-center px-4">
        <div>
          <h2 className="text-xl font-semibold text-[#6D1C24]">
            SLA Compliance: Overdue & At-Risk Tickets by Users
          </h2>
          <p>
            Users assigned to tickets that are past due or at risk of becoming
            so
          </p>
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
        config={slaComplianceByUsersChartConfig}
        className="w-[99%] md:w-full "
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={slaByUsers}
            margin={{ top: 15, right: 30, left: 20, bottom: 20 }}
            barSize={30}
            aria-label="Bar chart showing the amount of tickets by their SLA compliance status"
          >
            <CartesianGrid strokeDasharray="7 7" />
            <XAxis
              dataKey="label"
              aria-label="X-Axis Label: Users Assigned to Tickets"
              label={{
                value: "Users Assigned to Tickets",
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
            <Bar
              dataKey="atRiskValue"
              name="At Risk"
              label="At Risk"
              fill="#F59E0B"
              stroke="#B45309"
              strokeWidth={0.75}
              radius={[4, 4, 0, 0]}
            >
              <LabelList
                dataKey="atRiskValue"
                aria-label="Amount of tickets this user has that are at risk"
                position="top"
                formatter={(value: number) => (value ?? 0).toString()}
                className="fill-foreground"
              />
            </Bar>

            <Bar
              dataKey="overdueValue"
              name="Overdue"
              label="Overdue"
              fill="#DC2626"
              stroke="#7F1D1D"
              strokeWidth={0.75}
              radius={[4, 4, 0, 0]}
            >
              <LabelList
                dataKey="overdueValue"
                aria-label="Amount of tickets this user has that are overdue"
                position="top"
                formatter={(value: number) => (value ?? 0).toString()}
                className="fill-foreground"
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
}
