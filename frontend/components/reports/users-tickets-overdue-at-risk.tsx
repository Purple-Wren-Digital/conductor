"use client";

import React, { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog/base-dialog";
import { ReportProps } from "@/components/reports/reports-dashboard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useFetchSlaComplianceByUsersReport } from "@/hooks/use-reports";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSlaPolicies } from "@/hooks/use-sla";
import { formatSlaDuration } from "@/lib/api/sla";
import { InfoIcon, Loader2 } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

export const complianceByUsersDefaultValues = {
  assignees: [],
  ticketTotal: 0,
  assigneeTotal: 0,
};

export default function SlaComplianceByUsersReport({
  isSelected,
  filters,
}: ReportProps) {
  const [slaInfoOpen, setSlaInfoOpen] = useState(false);

  const isMobile = useIsMobile();
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

  const slaByUsers = useMemo(() => {
    return (
      reportData?.assignees.map((assignee) => ({
        id: assignee.id,
        label: assignee.name,
        value: assignee.ticketTotal,

        atRiskResponseLabel: "At Risk: No Response",
        atRiskResponseValue: assignee.response.atRisk,

        atRiskResolveLabel: "At Risk: Unresolved",
        atRiskResolveValue: assignee.resolve.atRisk,

        overdueResponseLabel: "Breached: No Response",
        overdueResponseValue: assignee.response.overdue,

        overdueResolveLabel: "Breached: Unresolved",
        overdueResolveValue: assignee.resolve.overdue,
      })) || []
    );
  }, [reportData]);

  const { data: policiesData, isLoading: policiesLoading } = useSlaPolicies();

  const policies = useMemo(() => policiesData?.policies || [], [policiesData]);

  const slaComplianceByUsersChartConfig: ChartConfig = useMemo(() => {
    if (!slaByUsers) return {};
    return Object.fromEntries(
      slaByUsers.map((entry) => [
        entry.label, //user name
        {
          label: entry.label,
          value: entry.value,
          atRiskResponseValue: entry.atRiskResponseValue,
          atRiskResolveValue: entry.atRiskResolveValue,

          overdueResponseValue: entry.overdueResponseValue,
          overdueResolveValue: entry.overdueResolveValue,
        },
      ])
    ) as ChartConfig;
  }, [slaByUsers]);

  return (
    <>
      <div
        className={`grid gap-4 auto-cols-[minmax(0,2fr)] place-content-evenly ${!isSelected ? "hidden" : ""}`}
      >
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
            <Button
              onClick={() => setSlaInfoOpen(true)}
              variant="ghost"
              size={"icon"}
              className="size-4.5"
            >
              <InfoIcon className="size-4.5" />
            </Button>
          </div>
        </div>
        {/* REPORT CONTENT */}
        <ChartContainer config={slaComplianceByUsersChartConfig}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={slaByUsers}
              margin={{
                top: isMobile ? 0 : 15,
                right: 30,
                left: isMobile ? 0 : 20,
                bottom: isMobile ? 10 : 20,
              }}
              barSize={15}
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
                  position: isMobile ? "" : "insideLeft",
                  dx: isMobile ? -5 : 5,
                }}
              />
              <ChartTooltip
                content={<ChartTooltipContent />}
                labelFormatter={(value) => value}
              />
              <Bar
                dataKey="atRiskResponseValue"
                name="At Risk: No Response"
                label="At Risk: No Response"
                fill="#F59E0B"
                stroke="#B45309"
                strokeWidth={0.75}
                radius={[4, 4, 0, 0]}
              >
                <LabelList
                  dataKey="atRiskResponseValue"
                  aria-label="Amount of tickets this user has that are at risk of breaching the response SLA"
                  position="top"
                  formatter={(value: number) => (value ?? 0).toString()}
                  className="fill-foreground"
                />
              </Bar>
              <Bar
                dataKey="atRiskResolveValue"
                name="At Risk: Unresolved"
                label="At Risk: Unresolved"
                fill="#F59E0B"
                stroke="#B45309"
                strokeWidth={0.75}
                radius={[4, 4, 0, 0]}
              >
                <LabelList
                  dataKey="atRiskResolveValue"
                  aria-label="Amount of tickets this user has that are at risk of breaching the resolve SLA"
                  position="top"
                  formatter={(value: number) => (value ?? 0).toString()}
                  className="fill-foreground"
                />
              </Bar>

              <Bar
                dataKey="overdueResponseValue"
                name="Breach: No Response"
                label="Breach: No Response"
                fill="#DC2626"
                stroke="#7F1D1D"
                strokeWidth={0.75}
                radius={[4, 4, 0, 0]}
              >
                <LabelList
                  dataKey="overdueResponseValue"
                  aria-label="Amount of tickets this user has that are have breached the response SLA"
                  position="top"
                  formatter={(value: number) => (value ?? 0).toString()}
                  className="fill-foreground"
                />
              </Bar>

              <Bar
                dataKey="overdueResolveValue"
                name="Breach: Unresolved"
                label="Breach: Unresolved"
                fill="#DC2626"
                stroke="#7F1D1D"
                strokeWidth={0.75}
                radius={[4, 4, 0, 0]}
              >
                <LabelList
                  dataKey="overdueResolveValue"
                  aria-label="Amount of tickets this user has that are have breached the resolve SLA"
                  position="top"
                  formatter={(value: number) => (value ?? 0).toString()}
                  className="fill-foreground"
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* POLICIES */}
        <div className="space-y-3 text-sm text-muted-foreground align-center w-[80%] mx-auto mt-4">
          <p className="text-center text-primary text-md font-semibold">
            SLA Policies
          </p>
          <Table>
            <TableHeader>
              <TableRow className="border-b-4">
                <TableHead className="text-primary">Urgency</TableHead>
                <TableHead className="text-primary">Active</TableHead>
                <TableHead className="text-primary">Respond</TableHead>
                <TableHead className="text-primary">Resolve</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="space-y-4">
              {policiesLoading && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">
                    <Loader2 className="animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              )}
              {!policiesLoading &&
                policies.length > 0 &&
                policies.map((policy) => (
                  <TableRow key={policy.id}>
                    <TableCell>
                      <span className="capitalize">
                        {policy.urgency.toLowerCase()}
                      </span>
                    </TableCell>

                    <TableCell>
                      <span>{policy.isActive ? "Active" : "Inactive"}</span>
                    </TableCell>

                    <TableCell>
                      <span>
                        {formatSlaDuration(policy.responseTimeMinutes)}
                      </span>
                    </TableCell>

                    <TableCell>
                      <span>
                        {formatSlaDuration(policy.resolutionTimeMinutes)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={slaInfoOpen} onOpenChange={setSlaInfoOpen}>
        <DialogContent>
          <DialogHeader className="absolute left-5.75 top-4">
            <DialogTitle
              className="text-muted-foreground"
              aria-label="Tooltip information modal"
            >
              <InfoIcon className="size-4" />
            </DialogTitle>
          </DialogHeader>
          <p className="flex flex-col  gap-2 mt-6 space-y-4 text-sm text-muted-foreground">
            <span>
              <strong>Response SLA:</strong> The clock starts when a ticket is
              created and stops when a staff member first responds (either by
              being assigned or leaving a comment).
            </span>
            <span>
              <strong>Resolution SLA:</strong> The clock starts when a ticket is
              created and stops when the ticket status is changed to Resolved.
            </span>
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
