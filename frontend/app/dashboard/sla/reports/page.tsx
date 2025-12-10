"use client";

import { useState } from "react";
import { useUserRole } from "@/hooks/use-user-role";
import { useSlaReport, useExportSlaReport } from "@/hooks/use-sla";
import { formatSlaDuration, getUrgencyColor, getComplianceColor } from "@/lib/api/sla";
import type { SlaReportFilters } from "@/lib/api/sla";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs/base-tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertCircle,
  Download,
  Loader2,
  TrendingUp,
  TrendingDown,
  Clock,
  Timer,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

export default function SlaReportsPage() {
  const { role, isLoading: roleLoading } = useUserRole();
  const isAdmin = role === "ADMIN";

  const [filters, setFilters] = useState<SlaReportFilters>({
    groupBy: "day",
  });

  // Calculate date range - default to last 30 days
  const getDateRange = (range: string) => {
    const now = new Date();
    const to = now.toISOString().split("T")[0];
    let from: string;

    switch (range) {
      case "7d":
        from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
        break;
      case "30d":
        from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
        break;
      case "90d":
        from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
        break;
      default:
        from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    }

    return { dateFrom: from, dateTo: to };
  };

  const [dateRange, setDateRange] = useState("30d");
  const currentFilters = {
    ...filters,
    ...getDateRange(dateRange),
  };

  const { data: reportData, isLoading: reportLoading, error } = useSlaReport(currentFilters);
  const exportReport = useExportSlaReport();

  if (roleLoading || reportLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You do not have permission to view SLA reports. This page is only accessible to Admins.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load SLA report. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const {
    metrics,
    byUrgency,
    byAssignee,
    trends,
    resolutionMetrics,
    resolutionByUrgency,
    resolutionTrends,
  } = reportData || {
    metrics: null,
    byUrgency: [],
    byAssignee: [],
    trends: [],
    resolutionMetrics: null,
    resolutionByUrgency: [],
    resolutionTrends: [],
  };

  const handleExport = () => {
    exportReport.mutate(getDateRange(dateRange));
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/sla">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">SLA Reports</h1>
            <p className="text-muted-foreground">
              Analyze SLA performance and compliance metrics
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label>Date Range:</Label>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Label>Group By:</Label>
            <Select
              value={filters.groupBy}
              onValueChange={(v) => setFilters((f) => ({ ...f, groupBy: v as "day" | "week" | "month" }))}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Day</SelectItem>
                <SelectItem value="week">Week</SelectItem>
                <SelectItem value="month">Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleExport} disabled={exportReport.isPending}>
            {exportReport.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Export CSV
          </Button>
        </div>
      </div>

      <Tabs defaultValue="response" className="space-y-4">
        <TabsList>
          <TabsTrigger value="response">
            <Clock className="h-4 w-4 mr-2" />
            Response SLA
          </TabsTrigger>
          <TabsTrigger value="resolution">
            <Timer className="h-4 w-4 mr-2" />
            Resolution SLA
          </TabsTrigger>
        </TabsList>

        {/* Response SLA Tab */}
        <TabsContent value="response" className="space-y-6">
          {/* Response Summary Cards */}
          {metrics && (
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Tickets
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{metrics.totalTickets}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {metrics.ticketsWithSla} with SLA tracking
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Response Compliance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold ${getComplianceColor(metrics.complianceRate)}`}>
                    {metrics.complianceRate.toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {metrics.ticketsMet} tickets met SLA
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Response Breaches
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-red-600">
                    {metrics.ticketsBreached}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Tickets that breached response SLA
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Avg Response Time
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {metrics.avgResponseTimeMinutes
                      ? formatSlaDuration(Math.round(metrics.avgResponseTimeMinutes))
                      : "N/A"}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Average first response
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Response By Urgency */}
          <Card>
            <CardHeader>
              <CardTitle>Response Compliance by Urgency</CardTitle>
              <CardDescription>
                Response SLA performance breakdown by ticket urgency level
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Urgency</TableHead>
                    <TableHead className="text-right">Total Tickets</TableHead>
                    <TableHead className="text-right">Met SLA</TableHead>
                    <TableHead className="text-right">Breached</TableHead>
                    <TableHead className="text-right">Compliance Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byUrgency.map((row) => (
                    <TableRow key={row.urgency}>
                      <TableCell>
                        <Badge className={getUrgencyColor(row.urgency)}>
                          {row.urgency}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{row.totalTickets}</TableCell>
                      <TableCell className="text-right">
                        <span className="text-green-600">{row.ticketsMet}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-red-600">{row.ticketsBreached}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={getComplianceColor(row.complianceRate)}>
                          {row.complianceRate.toFixed(1)}%
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Response By Assignee */}
          <Card>
            <CardHeader>
              <CardTitle>Response Compliance by Assignee</CardTitle>
              <CardDescription>
                Individual staff member response SLA performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Assignee</TableHead>
                    <TableHead className="text-right">Total Tickets</TableHead>
                    <TableHead className="text-right">Met SLA</TableHead>
                    <TableHead className="text-right">Breached</TableHead>
                    <TableHead className="text-right">Compliance</TableHead>
                    <TableHead className="text-right">Avg Response</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byAssignee.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No data available
                      </TableCell>
                    </TableRow>
                  ) : (
                    byAssignee.map((row) => (
                      <TableRow key={row.assigneeId || "unassigned"}>
                        <TableCell>{row.assigneeName || "Unassigned"}</TableCell>
                        <TableCell className="text-right">{row.totalTickets}</TableCell>
                        <TableCell className="text-right">
                          <span className="text-green-600">{row.ticketsMet}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-red-600">{row.ticketsBreached}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={getComplianceColor(row.complianceRate)}>
                            {row.complianceRate.toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {row.avgResponseTimeMinutes
                            ? formatSlaDuration(Math.round(row.avgResponseTimeMinutes))
                            : "N/A"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Response Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Response Compliance Trends</CardTitle>
              <CardDescription>
                Response SLA compliance over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              {trends.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No trend data available for the selected period
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Met</TableHead>
                      <TableHead className="text-right">Breached</TableHead>
                      <TableHead className="text-right">Compliance</TableHead>
                      <TableHead className="text-right">Trend</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trends.map((row, index) => {
                      const prevRate = index > 0 ? trends[index - 1].complianceRate : row.complianceRate;
                      const trend = row.complianceRate - prevRate;
                      return (
                        <TableRow key={row.period}>
                          <TableCell className="font-medium">{row.period}</TableCell>
                          <TableCell className="text-right">{row.totalTickets}</TableCell>
                          <TableCell className="text-right">
                            <span className="text-green-600">{row.ticketsMet}</span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="text-red-600">{row.ticketsBreached}</span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={getComplianceColor(row.complianceRate)}>
                              {row.complianceRate.toFixed(1)}%
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            {index === 0 ? (
                              <span className="text-muted-foreground">-</span>
                            ) : trend > 0 ? (
                              <span className="text-green-600 flex items-center justify-end gap-1">
                                <TrendingUp className="h-4 w-4" />
                                +{trend.toFixed(1)}%
                              </span>
                            ) : trend < 0 ? (
                              <span className="text-red-600 flex items-center justify-end gap-1">
                                <TrendingDown className="h-4 w-4" />
                                {trend.toFixed(1)}%
                              </span>
                            ) : (
                              <span className="text-muted-foreground">0%</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Resolution SLA Tab */}
        <TabsContent value="resolution" className="space-y-6">
          {/* Resolution Summary Cards */}
          {resolutionMetrics && (
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Tickets
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{resolutionMetrics.totalTickets}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {resolutionMetrics.ticketsWithSla} with SLA tracking
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Resolution Compliance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-3xl font-bold ${getComplianceColor(resolutionMetrics.complianceRate)}`}>
                    {resolutionMetrics.complianceRate.toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {resolutionMetrics.ticketsMet} tickets met SLA
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Resolution Breaches
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-red-600">
                    {resolutionMetrics.ticketsBreached}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Tickets that breached resolution SLA
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Avg Resolution Time
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {resolutionMetrics.avgResolutionTimeMinutes
                      ? formatSlaDuration(Math.round(resolutionMetrics.avgResolutionTimeMinutes))
                      : "N/A"}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Average time to resolution
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Resolution By Urgency */}
          <Card>
            <CardHeader>
              <CardTitle>Resolution Compliance by Urgency</CardTitle>
              <CardDescription>
                Resolution SLA performance breakdown by ticket urgency level
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Urgency</TableHead>
                    <TableHead className="text-right">Total Tickets</TableHead>
                    <TableHead className="text-right">Met SLA</TableHead>
                    <TableHead className="text-right">Breached</TableHead>
                    <TableHead className="text-right">Compliance Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resolutionByUrgency.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No data available
                      </TableCell>
                    </TableRow>
                  ) : (
                    resolutionByUrgency.map((row) => (
                      <TableRow key={row.urgency}>
                        <TableCell>
                          <Badge className={getUrgencyColor(row.urgency)}>
                            {row.urgency}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{row.totalTickets}</TableCell>
                        <TableCell className="text-right">
                          <span className="text-green-600">{row.ticketsMet}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-red-600">{row.ticketsBreached}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={getComplianceColor(row.complianceRate)}>
                            {row.complianceRate.toFixed(1)}%
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Resolution Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Resolution Compliance Trends</CardTitle>
              <CardDescription>
                Resolution SLA compliance over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              {resolutionTrends.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No trend data available for the selected period
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Met</TableHead>
                      <TableHead className="text-right">Breached</TableHead>
                      <TableHead className="text-right">Compliance</TableHead>
                      <TableHead className="text-right">Trend</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resolutionTrends.map((row, index) => {
                      const prevRate = index > 0 ? resolutionTrends[index - 1].complianceRate : row.complianceRate;
                      const trend = row.complianceRate - prevRate;
                      return (
                        <TableRow key={row.period}>
                          <TableCell className="font-medium">{row.period}</TableCell>
                          <TableCell className="text-right">{row.totalTickets}</TableCell>
                          <TableCell className="text-right">
                            <span className="text-green-600">{row.ticketsMet}</span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="text-red-600">{row.ticketsBreached}</span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={getComplianceColor(row.complianceRate)}>
                              {row.complianceRate.toFixed(1)}%
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            {index === 0 ? (
                              <span className="text-muted-foreground">-</span>
                            ) : trend > 0 ? (
                              <span className="text-green-600 flex items-center justify-end gap-1">
                                <TrendingUp className="h-4 w-4" />
                                +{trend.toFixed(1)}%
                              </span>
                            ) : trend < 0 ? (
                              <span className="text-red-600 flex items-center justify-end gap-1">
                                <TrendingDown className="h-4 w-4" />
                                {trend.toFixed(1)}%
                              </span>
                            ) : (
                              <span className="text-muted-foreground">0%</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
