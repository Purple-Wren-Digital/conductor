"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { API_BASE } from "@/lib/api/utils";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Plus,
  Ticket,
  Clock,
  AlertTriangle,
  Users,
  TrendingUp,
} from "lucide-react";
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Bar,
  BarChart,
  Pie,
  PieChart,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  LabelList,
} from "recharts";
import type { DashboardMetrics, TicketNotificationCallback } from "@/lib/types";
import { CreateTicketForm } from "@/components/ui/tickets/ticket-form/create-ticket-form";
import { createAndSendNotification } from "@/lib/utils/notifications";
import { useAuth } from "@clerk/nextjs";

const STATUS_ORDER = [
  "ASSIGNED",
  "AWAITING_RESPONSE",
  "IN_PROGRESS",
  "RESOLVED",
] as const;
type StatusKey = (typeof STATUS_ORDER)[number];
const STATUS_LABELS: Record<StatusKey, string> = {
  ASSIGNED: "Assigned",
  AWAITING_RESPONSE: "Awaiting Response",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
};
const STATUS_COLORS: Record<StatusKey, string> = {
  ASSIGNED: "#6B7280",
  AWAITING_RESPONSE: "#9CA3AF",
  IN_PROGRESS: "#FACC15",
  RESOLVED: "#22C55E",
};

const URGENCY_ORDER = ["HIGH", "MEDIUM", "LOW"] as const;
type UrgencyKey = (typeof URGENCY_ORDER)[number];
const URGENCY_LABELS: Record<UrgencyKey, string> = {
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
};
const URGENCY_COLORS: Record<UrgencyKey, string> = {
  HIGH: "#EF4444",
  MEDIUM: "#F97316",
  LOW: "#FACC15",
};

const chartConfig = {
  status: {
    ASSIGNED: { label: STATUS_LABELS.ASSIGNED, color: STATUS_COLORS.ASSIGNED },
    AWAITING_RESPONSE: {
      label: STATUS_LABELS.AWAITING_RESPONSE,
      color: STATUS_COLORS.AWAITING_RESPONSE,
    },
    IN_PROGRESS: {
      label: STATUS_LABELS.IN_PROGRESS,
      color: STATUS_COLORS.IN_PROGRESS,
    },
    RESOLVED: { label: STATUS_LABELS.RESOLVED, color: STATUS_COLORS.RESOLVED },
  },
  urgency: {
    HIGH: { label: URGENCY_LABELS.HIGH, color: URGENCY_COLORS.HIGH },
    MEDIUM: { label: URGENCY_LABELS.MEDIUM, color: URGENCY_COLORS.MEDIUM },
    LOW: { label: URGENCY_LABELS.LOW, color: URGENCY_COLORS.LOW },
  },
};

export function DashboardOverview() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const { getToken } = useAuth();

  const handleSendTicketNotifications = useCallback(
    async ({ trigger, receivingUser, data }: TicketNotificationCallback) => {
      try {
        const token = await getToken();
        if (!token) {
          throw new Error("Failed to get authentication token");
        }
        await createAndSendNotification({
          authToken: token,
          trigger: trigger,
          receivingUser: receivingUser,
          data: data,
        });
        // console.log("TicketList - Notifications - Response:", response);
      } catch (error) {
        console.error("TicketList - Unable to generate notifications", error);
      }
    },
    [getToken]
  );

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/dashboard/metrics`);
      if (!response.ok) throw new Error("Failed to fetch dashboard metrics");
      const data = await response.json();
      setMetrics(data.metrics);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const statusChartData = useMemo(() => {
    if (!metrics) return [];
    return STATUS_ORDER.map((key) => ({
      status: key,
      count: metrics.ticketsByStatus[key] ?? 0,
      fill: STATUS_COLORS[key],
    }));
  }, [metrics]);

  const urgencyChartData = useMemo(() => {
    if (!metrics) return [];
    return URGENCY_ORDER.map((key) => ({
      urgency: key,
      count: metrics.ticketsByUrgency[key] ?? 0,
      fill: URGENCY_COLORS[key],
    }));
  }, [metrics]);

  if (loading || !metrics) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 bg-muted rounded w-32 animate-pulse" />
          <div className="h-10 bg-muted rounded w-32 animate-pulse" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 bg-muted rounded w-20" />
                <div className="h-4 w-4 bg-muted rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-16 mb-1" />
                <div className="h-3 bg-muted rounded w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(2)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-40" />
              </CardHeader>
              <CardContent>
                <div className="h-48 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Overview</h2>
        <Button className="gap-2" onClick={() => setShowCreateForm(true)}>
          <Plus className="h-4 w-4" />
          Create Ticket
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalTickets}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.openTickets}</div>
            <p className="text-xs text-muted-foreground">Needs attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {metrics.overdueTickets}
            </div>
            <p className="text-xs text-muted-foreground">Past due date</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.avgResponseTime}h</div>
            <p className="text-xs text-muted-foreground">Response time</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Tickets by Status</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={chartConfig.status}
              className="h-[220px] w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={statusChartData}
                  margin={{ top: 20, right: 20, left: 10, bottom: 10 }}
                >
                  <XAxis
                    dataKey="status"
                    tick={{ fontSize: 12 }}
                    interval={0}
                    tickFormatter={(value: StatusKey) =>
                      STATUS_LABELS[value] || value
                    }
                  />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <ChartTooltip
                    content={<ChartTooltipContent />}
                    labelFormatter={(v: StatusKey) => STATUS_LABELS[v] || v}
                  />
                  <Bar
                    dataKey="count"
                    isAnimationActive={false}
                    radius={[4, 4, 0, 0]}
                  >
                    {statusChartData.map((entry, i) => (
                      <Cell key={`status-cell-${i}`} fill={entry.fill} />
                    ))}
                    <LabelList
                      dataKey="count"
                      position="top"
                      formatter={(v: number) => (v ?? 0).toString()}
                      className="fill-foreground"
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>

            <div className="flex flex-wrap gap-3 mt-4 justify-center">
              {STATUS_ORDER.map((key) => (
                <div key={key} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: STATUS_COLORS[key] }}
                  />
                  <span className="text-sm">
                    <span className="font-semibold">{STATUS_LABELS[key]}:</span>{" "}
                    {metrics.ticketsByStatus[key] ?? 0}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Open Tickets by Urgency</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={chartConfig.urgency}
              className="h-[220px] w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={urgencyChartData}
                    dataKey="count"
                    nameKey="urgency"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={40}
                    isAnimationActive={false}
                    stroke="#FFFFFF"
                    strokeWidth={1}
                  >
                    {urgencyChartData.map((entry, i) => (
                      <Cell key={`urg-cell-${i}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip
                    content={<ChartTooltipContent />}
                    labelFormatter={(value: UrgencyKey) =>
                      URGENCY_LABELS[value] || value
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 mt-4 justify-center">
              {URGENCY_ORDER.map((key) => (
                <div key={key} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: URGENCY_COLORS[key] }}
                  />
                  <span className="text-sm">
                    <span className="font-semibold">
                      {URGENCY_LABELS[key]}:
                    </span>{" "}
                    {metrics.ticketsByUrgency[key] ?? 0}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <CreateTicketForm
        isOpen={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        onSuccess={fetchMetrics}
        handleSendTicketNotifications={handleSendTicketNotifications}
      />
    </div>
  );
}
