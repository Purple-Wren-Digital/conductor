"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { useQuery } from "@tanstack/react-query";
import { useAuth, useUser } from "@clerk/nextjs";
import { API_BASE } from "@/lib/api/utils";
import { BarChartIcon, Building2, TrendingUp } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMemo, useState } from "react";
import { TicketTabs } from "../ui/tabs/ticket-tabs";
import { useFetchAllMarketCenters } from "@/hooks/use-market-center";
import { useUserRole } from "@/hooks/use-user-role";
import { useListAdminTickets } from "@/hooks/use-tickets";
import { TeamSwitcher } from "../ui/team-switcher";
import { ScrollArea } from "@radix-ui/react-scroll-area";
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
import {
  chartColors,
  getResolvedInBusinessDays,
  STATUS_COLORS,
  STATUS_LABELS,
  STATUS_ORDER,
  StatusKey,
  ticketByStatusChartConfig,
} from "@/lib/utils";
import type { MarketCenter, Ticket } from "@/lib/types";

export function AdminDashboard() {
  const { user: clerkUser } = useUser();
  const { getToken } = useAuth();
  const { role } = useUserRole();

  const [selectedMarketCenterId, setSelectedMarketCenterId] =
    useState<string>("all");

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (selectedMarketCenterId !== "all") {
      params.append("marketCenterId", selectedMarketCenterId);
    }

    return params;
  }, [selectedMarketCenterId]);

  const queryKeyParams = useMemo(
    () => Object.fromEntries(queryParams.entries()) as Record<string, string>,
    [queryParams]
  );
  const adminTicketsQueryKey = useMemo(
    () => ["admin-tickets-dashboard", queryKeyParams] as const,
    [queryKeyParams]
  );

  const { data: ticketsData, isLoading: ticketsLoading } = useListAdminTickets({
    role,
    adminTicketsQueryKey,
    queryParams,
  });

  const { data: usersData } = useQuery({
    queryKey: ["all-users"],
    queryFn: async () => {
      if (!clerkUser?.id) throw new Error("Not authenticated");
      const token = await getToken();
      if (!token) throw new Error("No authentication token");
      const response = await fetch(`${API_BASE}/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch users");
      return response.json();
    },
    enabled: !!clerkUser,
  });

  const { data: marketCentersData, isLoading: isLoadingMarketCenters } =
    useFetchAllMarketCenters(role);
  const marketCenters = useMemo(() => {
    return marketCentersData?.marketCenters ?? [];
  }, [marketCentersData]);

  const tickets = ticketsData?.tickets || [];
  const allUsers = usersData?.users || [];

  const filteredTickets =
    selectedMarketCenterId === "all"
      ? tickets
      : tickets.filter((t: any) => {
          const creator = allUsers.find((u: any) => u.id === t.creatorId);
          return creator?.marketCenterId === selectedMarketCenterId;
        });

  const filteredUsers =
    selectedMarketCenterId === "all"
      ? allUsers
      : allUsers.filter(
          (u: any) => u.marketCenterId === selectedMarketCenterId
        );

  const stats = useMemo(() => {
    const totalTickets = filteredTickets.length;
    const openTickets = filteredTickets.filter(
      (t: any) => t.status !== "RESOLVED"
    ).length;
    const highPriority = filteredTickets.filter(
      (t: any) => t.urgency === "HIGH" && t.status !== "RESOLVED"
    ).length;
    const unassignedTickets = filteredTickets.filter(
      (t: any) => !t.assigneeId && t.status === "UNASSIGNED"
    ).length;

    const ticketsByStatus = filteredTickets.reduce(
      (acc: Record<string, number>, ticket: any) => {
        acc[ticket.status] = (acc[ticket.status] || 0) + 1;
        return acc;
      },
      {}
    );

    const colorValues = Object.entries(chartColors)
      .filter(([key]) => key !== "grey")
      .map(([_, value]) => value);

    let colorIndex = 0;
    const colorMap: Record<string, string> = {}; // track assigned colors
    const ticketsByMarketCenter = filteredTickets.reduce(
      (
        acc: Record<string, { name: string; color: string; count: number }>,
        ticket: any
      ) => {
        const assignee = filteredUsers.find(
          (u: any) => u.id === ticket.assigneeId
        );

        const mcId = assignee?.marketCenterId || "unassigned";
        const marketCenter = marketCenters.find(
          (mc: MarketCenter) => mc.id === mcId
        );

        const mcName = marketCenter?.name || "Unassigned";

        // Initialize a static color index tracker outside reduce (via closure)
        let color: string;
        if (mcName === "Unassigned") {
          color = chartColors.grey;
        } else {
          if (!colorMap[mcId]) {
            colorMap[mcId] = colorValues[colorIndex % colorValues.length];
            colorIndex += 1;
          }
          color = colorMap[mcId];
        }

        if (!acc[mcId]) {
          acc[mcId] = { name: mcName, color, count: 0 };
        }

        acc[mcId].count += 1;
        return acc;
      },
      {}
    );

    const totalUsers = filteredUsers.length;
    const resolutionRate = totalTickets
      ? Math.round(
          (filteredTickets.filter((t: any) => t.status === "RESOLVED").length /
            totalTickets) *
            100
        )
      : 0;

    const now = new Date();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(now.getDate() - 7); // 7 days ago

    const resolvedTicketsCount = filteredTickets.filter(
      (t: Ticket) => t.status === "RESOLVED"
    ).length;
    oneWeekAgo.setDate(now.getDate() - 7);

    let totalBusinessDays = 0;
    let newTickets = 0;

    filteredTickets.forEach((t: Ticket) => {
      const status = t.status;
      const createdDate = t.createdAt ? new Date(t.createdAt) : null;
      const resolvedDate = t.resolvedAt ? new Date(t.resolvedAt) : null;

      if (status === "RESOLVED" && createdDate && resolvedDate) {
        totalBusinessDays += getResolvedInBusinessDays(
          createdDate,
          resolvedDate
        );
      }
    });
    const avgResolutionBusinessDays = resolvedTicketsCount
      ? Number((totalBusinessDays / resolvedTicketsCount).toFixed(2))
      : 0;

    filteredTickets.forEach((t: Ticket) => {
      const createdDate = t.createdAt ? new Date(t.createdAt) : null;
      if (createdDate && createdDate >= oneWeekAgo) {
        newTickets += 1;
      }
    });

    return {
      totalTickets,
      openTickets,
      highPriority,
      unassignedTickets,
      ticketsByStatus,
      ticketsByMarketCenter: Object.values(ticketsByMarketCenter),
      totalUsers,
      resolutionRate,
      newTickets,
      resolvedTicketsCount,
      avgResolutionBusinessDays,
    };
  }, [filteredTickets, filteredUsers, marketCenters]);

  const statusChartData = useMemo(() => {
    if (!stats) return [];
    return STATUS_ORDER.map((key) => ({
      status: key,
      count: stats.ticketsByStatus[key] ?? 0,
      fill: STATUS_COLORS[key],
    }));
  }, [stats]);

  const ticketsByMarketCenterChartConfig: ChartConfig = useMemo(() => {
    if (!stats) return {};
    return Object.fromEntries(
      stats.ticketsByMarketCenter.map((entry) => [
        // key must match the value used by the chart payload (name or id)
        entry.name,
        {
          label: entry.name,
          color: entry.color || chartColors.grey,
        },
      ])
    ) as ChartConfig;
  }, [stats]);

  if (ticketsLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-5 md:items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--conductor)]">
            Welcome, {clerkUser?.firstName}
          </h1>
          <p className="text-muted-foreground">
            System-wide overview and management
          </p>
        </div>
        <div className="flex flex-col-reverse gap-2 justify-between items-center w-full sm:w-fit sm:flex-row sm:gap-5">
          <div className="space-y-2 w-fit">
            <TeamSwitcher
              selectedMarketCenterId={selectedMarketCenterId}
              setSelectedMarketCenterId={setSelectedMarketCenterId}
            />
          </div>
          <Button asChild className="w-full sm:w-fit">
            <Link href="/dashboard/reports">
              <BarChartIcon className="mr-2 h-4 w-4" /> View Reports
            </Link>
          </Button>
        </div>
      </div>

      <TicketTabs />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-center font-medium">
              Total Tickets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-2xl font-bold">
              {stats.totalTickets}
            </p>
            <p className="text-center text-xs text-muted-foreground">
              across all time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-center font-medium">
              New Tickets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-2xl font-bold">{stats.newTickets}</p>
            <p className="text-center text-xs text-muted-foreground">
              in the last 7 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-center font-medium">
              Active Tickets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-2xl font-bold">
              {stats.openTickets}
            </p>
            <p className="text-center text-xs text-muted-foreground">
              {stats.highPriority} high priority • {stats.unassignedTickets}{" "}
              unassigned
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-center font-medium">
              Ticket Closed within
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-2xl font-bold">
              {stats.avgResolutionBusinessDays}
            </p>
            <p className="text-center text-xs text-muted-foreground">
              business days (average)
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* MARKET CENTERS */}
        <Card className="max-w-2xs sm:max-w-full">
          <CardHeader>
            <CardTitle>Market Centers</CardTitle>
            <CardDescription>
              {marketCenters?.length ?? "0"} market centers • {stats.totalUsers}{" "}
              users
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="space-y-4 md:h-50 overflow-y-auto">
              {!isLoadingMarketCenters &&
                (!marketCenters || !marketCenters?.length) && (
                  <p className="space-y-4 text-sm text-muted-foreground font-medium">
                    No market centers found
                  </p>
                )}

              {!isLoadingMarketCenters &&
                marketCenters &&
                marketCenters?.length > 0 &&
                marketCenters?.map((mc: any) => {
                  const isViewingStats = selectedMarketCenterId === mc?.id;
                  const categoriesTotal = mc?.ticketCategories
                    ? mc?.ticketCategories.length
                    : 0;
                  return (
                    <div
                      key={mc?.id}
                      onClick={() => setSelectedMarketCenterId(mc?.id)}
                      className={`flex flex-col p-2 rounded hover:bg-muted flex-wrap ${
                        isViewingStats && "bg-muted"
                      }`}
                    >
                      <div className="flex justify-between">
                        <Link
                          href={`/dashboard/marketCenters/${mc.id}?tab=team`}
                          className="text-[12px] sm:text-md font-medium hover:underline cursor-pointer"
                        >
                          {mc?.name && mc.name}
                        </Link>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-[10px] sm:text-xs text-muted-foreground">
                          #{mc?.id && mc.id.substring(0, 8)}
                        </p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">
                          Users: {mc?.users ? mc?.users.length : 0}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Categories: {categoriesTotal}
                        </p>
                      </div>
                    </div>
                  );
                })}
            </ScrollArea>

            <div className="mt-4">
              <Button asChild variant="outline" className="w-fit md:w-full">
                <Link href="/dashboard/marketCenters">
                  Manage Market Centers
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* TICKETS BY MARKET CENTER */}
        <Card className="max-w-2xs sm:max-w-full">
          <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-lg">
              Open Tickets by Market Center
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground hidden sm:visible" />
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={ticketsByMarketCenterChartConfig}
              className="h-[220px] w-[99%] md:w-full mx-auto"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats?.ticketsByMarketCenter}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={95}
                    innerRadius={47.5}
                    isAnimationActive={false}
                    stroke="#FFFFFF"
                    strokeWidth={1}
                    labelLine={false}
                  >
                    <LabelList dataKey="count" position="inside" />

                    {stats?.ticketsByMarketCenter.map((entry, i) => (
                      <Cell key={`urg-cell-${i}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const { name, count, color } = payload[0].payload;
                        return (
                          <div className="border border-border/50 px-2.5 py-1.5 bg-background shadow-xl rounded-md min-w-[8rem]">
                            <p className="font-medium text-xs">{name}</p>
                            <div className="flex items-center gap-2">
                              <div
                                className={`h-2.5 w-2.5 rounded`}
                                style={{ backgroundColor: color }}
                              />
                              <p className="text-xs">{count} tickets</p>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>

            <div className="flex flex-wrap gap-2 justify-center">
              {stats?.ticketsByMarketCenter.map((entry) => (
                <div key={entry.name} className="flex items-center gap-0.75">
                  <span
                    className="w-1.5 h-1.5 rounded-md"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-xs font-medium">{entry.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* TICKETS BY STATUS */}
        <Card className="max-w-2xs sm:max-w-full">
          <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
            <div className="flex flex-col gap-1">
              <CardTitle>Tickets by Status</CardTitle>
              <CardDescription>
                {filteredTickets.length ?? "0"} total tickets
                {selectedMarketCenterId === "all"
                  ? " across all teams"
                  : ""}{" "}
              </CardDescription>
            </div>
            <TrendingUp className="h-4 w-4 text-muted-foreground hidden sm:visible" />
          </CardHeader>
          <CardContent className="space-y-2 md:h-50">
            <ChartContainer
              config={ticketByStatusChartConfig}
              className="h-[220px] w-[99%] md:w-full mx-auto "
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={statusChartData}
                  margin={{
                    left: -30,
                    bottom: 10,
                  }}
                >
                  <XAxis
                    dataKey="status"
                    tick={{ fontSize: window.innerWidth < 640 ? 10 : 12 }}
                    angle={window.innerWidth < 640 ? 0 : -15}
                    tickMargin={10}
                    tickFormatter={(value: StatusKey) =>
                      STATUS_LABELS[value] || value
                    }
                  />
                  <YAxis
                    tick={{ fontSize: window.innerWidth < 640 ? 10 : 12 }}
                    allowDecimals={false}
                    tickMargin={5}
                  />
                  <ChartTooltip
                    content={<ChartTooltipContent />}
                    labelFormatter={(v: StatusKey) => STATUS_LABELS[v] || v}
                  />
                  <Bar
                    dataKey="count"
                    isAnimationActive={true}
                    radius={[4, 4, 0, 0]}
                  >
                    {statusChartData.map((entry, i) => (
                      <Cell key={`status-cell-${i}`} fill={entry.fill} />
                    ))}
                    <LabelList
                      dataKey="count"
                      position="top"
                      formatter={(v: number) => (v ?? 0).toString()}
                      className="fill-foreground rounded-md"
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
            <CardDescription className="text-[12px] text-center md:text-md">
              Viewing{" "}
              {selectedMarketCenterId === "all"
                ? "all market centers"
                : `Market Center #${selectedMarketCenterId.slice(0, 8)}`}
            </CardDescription>
          </CardContent>
        </Card>

        {/* RECENT TICKET ACTIVITY */}
        <Card className="max-w-2xs sm:max-w-full">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              {filteredTickets.length ?? "0"} total tickets
              {selectedMarketCenterId === "all" ? " across all teams" : ""}{" "}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="space-y-2 md:h-50 overflow-y-auto">
              {filteredTickets.slice(0, 5).map((ticket: any) => (
                <div
                  key={ticket.id}
                  className="flex items-center justify-between flex-wrap p-2 rounded hover:bg-muted"
                >
                  <div className="flex-1">
                    <Link
                      href={`/dashboard/tickets/${ticket.id}`}
                      className="text-[12px] sm:text-md font-medium hover:underline"
                    >
                      {ticket.title}
                    </Link>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] sm:text-xs text-muted-foreground">
                        #{ticket.id.substring(0, 8)}
                      </span>
                      <Badge
                        variant={ticket.urgency.toLowerCase() as any}
                        className="text-[10px] sm:text-xs"
                      >
                        {ticket.urgency}
                      </Badge>
                      {ticket.creator && (
                        <span className="text-[10px] sm:text-xs text-muted-foreground">
                          by {ticket.creator.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </ScrollArea>
            <div className="mt-4">
              <Button asChild variant="outline" className="w-fit md:w-full">
                <Link href="/dashboard/tickets">View All Tickets</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Health</CardTitle>
          <CardDescription>
            Key metrics and performance indicators
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm font-medium">Resolution Rate</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">
                  {stats.resolutionRate}%
                </span>
                <Badge
                  variant={
                    stats.resolutionRate <= 59.9
                      ? "orange"
                      : stats.resolutionRate === 60 ||
                          stats.resolutionRate <= 79.9
                        ? "warning"
                        : "success"
                  }
                >
                  {stats.resolutionRate <= 59.9
                    ? "Poor"
                    : stats.resolutionRate === 60 ||
                        stats.resolutionRate <= 79.9
                      ? "Fair"
                      : "Excellent"}
                </Badge>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium">Active Teams</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">
                  {marketCenters?.length || 0}
                </span>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium">System Load</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">Normal</span>
                <Badge variant="secondary">Healthy</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
