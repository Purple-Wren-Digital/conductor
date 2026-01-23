"use client";

import { useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/context/store-provider";
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
import { CreateTicketForm } from "@/components/ui/tickets/ticket-form/create-ticket-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StarRating } from "@/components/ui/ratingInput/star-rating-static";
import { ToolTip } from "@/components/ui/tooltip/tooltip";
import { useAuth, useUser } from "@clerk/nextjs";
import { API_BASE } from "@/lib/api/utils";
import {
  BarChartIcon,
  Building2,
  Clock,
  InfoIcon,
  Plus,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useFetchAllMarketCenters } from "@/hooks/use-market-center";
import { useUserRole } from "@/hooks/use-user-role";
import {
  useListAllRatings,
  useFetchRatingsByMarketCenter,
  useFetchAdminTickets,
} from "@/hooks/use-tickets";
import { useSlaMetrics } from "@/hooks/use-sla";
import { getComplianceColor } from "@/lib/api/sla";
import {
  chartColors,
  STATUS_COLORS,
  STATUS_LABELS,
  STATUS_ORDER,
  StatusKey,
  statusOptions,
  ticketByStatusChartConfig,
} from "@/lib/utils";
import type { MarketCenter, PrismaUser, Ticket } from "@/lib/types";
import { calculateStaffStats } from "@/lib/utils/staff-stats";
import { useIsEnterprise } from "@/hooks/useSubscription";
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

export function AdminDashboard() {
  const [selectedMarketCenter, setSelectedMarketCenter] = useState<{
    name: string;
    id: string;
  }>({ name: "all", id: "all" } as any);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { user: clerkUser } = useUser();
  const { getToken } = useAuth();
  const { currentUser } = useStore();
  const { role } = useUserRole();
  const { isEnterprise } = useIsEnterprise();

  const router = useRouter();
  const queryClient = useQueryClient();

  const navigateToTicketsWithFilter = useCallback(
    (filterType: "active" | "new" | "overdue" | "resolved") => {
      router.push(`/dashboard/tickets?filter=${filterType}`);
    },
    [router]
  );

  // Fetch market centers
  const { data: marketCentersData, isLoading: marketCentersLoading } =
    useFetchAllMarketCenters(role);

  const marketCenters: MarketCenter[] = useMemo(() => {
    return marketCentersData?.marketCenters ?? [];
  }, [marketCentersData]);

  const totalMarketCenters = useMemo(() => {
    return marketCentersData?.total || 0;
  }, [marketCentersData]);

  // Fetch tickets
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    statusOptions.forEach((option) => {
      params.append("status", option);
    });

    if (isEnterprise && selectedMarketCenter?.id !== "all") {
      params.append("marketCenterId", selectedMarketCenter.id);
    }
    if (!isEnterprise && currentUser?.marketCenterId) {
      params.append("marketCenterId", currentUser.marketCenterId);
    }

    return params;
  }, [isEnterprise, selectedMarketCenter, currentUser]);

  const queryKeyParams = useMemo(
    () => Object.fromEntries(queryParams.entries()) as Record<string, string>,
    [queryParams]
  );
  const adminTicketsQueryKey = useMemo(
    () => ["admin-tickets-dashboard", queryKeyParams] as const,
    [queryKeyParams]
  );

  const { data: ticketsData, isLoading: ticketsLoading } = useFetchAdminTickets(
    {
      role,
      adminTicketsQueryKey,
      queryParams,
      hydrated: true,
    }
  );
  const tickets = useMemo(() => ticketsData?.tickets || [], [ticketsData]);

  const adminTicketsQueryInvalidator = () =>
    queryClient.invalidateQueries({ queryKey: adminTicketsQueryKey });

  // Fetch users
  const { data: usersData, isLoading: isUsersLoading } = useQuery({
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
  const teamMembers: PrismaUser[] = useMemo(() => {
    const allUsers: PrismaUser[] = usersData?.users || [];
    if (
      !!allUsers &&
      isEnterprise &&
      selectedMarketCenter &&
      selectedMarketCenter?.id !== "all"
    ) {
      return allUsers.filter(
        (user) => user.marketCenterId === selectedMarketCenter.id
      );
    }
    return allUsers;
  }, [usersData, isEnterprise, selectedMarketCenter]);

  const { data: globalAverages } = useListAllRatings(
    ["admin-dashboard-global-ratings", role ?? "AGENT"],
    role
  );

  const { data: singleMcRatings } = useFetchRatingsByMarketCenter(
    ["admin-dashboard-single-mc-ratings", selectedMarketCenter?.id],
    selectedMarketCenter?.id
  );

  // Use single MC ratings when there's only one market center, otherwise use global averages
  const displayRatings = useMemo(() => {
    if (selectedMarketCenter?.id !== "all" || marketCenters.length === 1) {
      return singleMcRatings;
    }
    return globalAverages;
  }, [
    marketCenters.length,
    selectedMarketCenter?.id,
    singleMcRatings,
    globalAverages,
  ]);

  // SLA Metrics - last 30 days
  const slaDateFilters = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return {
      dateFrom: thirtyDaysAgo.toISOString().split("T")[0],
      dateTo: now.toISOString().split("T")[0],
    };
  }, []);
  const { data: slaMetricsData } = useSlaMetrics(slaDateFilters);

  const stats = useMemo(() => {
    const totalTeamMembers = teamMembers.filter(
      (m: any) => m?.role && m.role !== "AGENT"
    ).length;
    const totalTickets = tickets.length;
    const openTickets = tickets.filter((t: any) => t.status !== "RESOLVED");
    const openTicketsCount = openTickets.length;
    const highPriority = tickets.filter(
      (t: any) => t.urgency === "HIGH" && t.status !== "RESOLVED"
    ).length;
    const unassignedTickets = openTickets.filter(
      (t: Ticket) =>
        t.status === "UNASSIGNED" || (t.status === "CREATED" && !t?.assigneeId)
    ).length;
    const overdueTickets = tickets.filter((t: Ticket) => {
      if (t.status !== "RESOLVED" && t?.dueDate) {
        const dueDate = new Date(t.dueDate);
        const now = new Date();
        return dueDate < now;
      }
      return false;
    }).length;

    const ticketsByStatus = tickets.reduce(
      (acc: Record<string, number>, ticket: Ticket) => {
        const statusKey =
          ticket.status === "ASSIGNED" ||
          (ticket.status === "CREATED" && !!ticket?.assigneeId)
            ? "ASSIGNED"
            : ticket.status === "UNASSIGNED" ||
                (ticket.status === "CREATED" && !ticket?.assigneeId)
              ? "UNASSIGNED"
              : ticket.status;
        acc[statusKey] = (acc[statusKey] || 0) + 1;
        return acc;
      },
      {}
    );

    const colorValues = Object.entries(chartColors)
      .filter(([key]) => key !== "grey")
      .map(([_, value]) => value);

    let colorIndex = 0;
    const colorMap: Record<string, string> = {}; // track assigned colors

    const ticketsByUser: Record<
      string,
      { name: string; color: string; count: number }
    > = openTickets.reduce(
      (
        acc: Record<string, { name: string; color: string; count: number }>,
        ticket: any
      ) => {
        const assignee =
          ticket.status !== "UNASSIGNED" ||
          (ticket.status === "CREATED" && !ticket?.assigneeId)
            ? teamMembers.find((u: any) => u.id === ticket.assigneeId)
            : null;

        if (!assignee?.id) {
          return acc;
        }

        const userId = assignee.id;
        const userName = assignee.name ?? assignee.id.slice(0, 8);

        if (!colorMap[userId]) {
          colorMap[userId] = colorValues[colorIndex % colorValues.length];
          colorIndex += 1;
        }

        if (!acc[userId] && userId) {
          acc[userId] = { name: userName, color: colorMap[userId], count: 0 };
        }

        acc[userId].count += 1;
        return acc;
      },
      {}
    );

    const now = new Date();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(now.getDate() - 7); // 7 days ago

    let createdThisWeek = 0;
    let resolvedThisWeek = 0;

    tickets.forEach((t: Ticket) => {
      const createdDate = t.createdAt ? new Date(t.createdAt) : null;
      const resolvedDate =
        t.status === "RESOLVED" && t.resolvedAt ? new Date(t.resolvedAt) : null;

      if (createdDate && createdDate >= oneWeekAgo) {
        createdThisWeek += 1;
      }
      if (resolvedDate && resolvedDate >= oneWeekAgo) {
        resolvedThisWeek += 1;
      }
    });

    return {
      totalTickets,
      openTickets,
      openTicketsCount,
      highPriority,
      unassignedTickets,
      overdueTickets,
      ticketsByStatus,
      totalTeamMembers,
      ticketsByUser: Object.values(ticketsByUser),
      createdThisWeek,
      resolvedThisWeek,
    };
  }, [tickets, teamMembers]);

  const staffStats = useMemo(() => {
    return calculateStaffStats(teamMembers, tickets);
  }, [teamMembers, tickets]);

  const statusChartData = useMemo(() => {
    if (!stats) return [];
    return STATUS_ORDER.map((key) => ({
      status: key,
      count: stats.ticketsByStatus[key] ?? 0,
      fill: STATUS_COLORS[key],
    }));
  }, [stats]);

  const ticketsByUserChartConfig: ChartConfig = useMemo(() => {
    if (!stats) return {};
    return Object.fromEntries(
      stats.ticketsByUser.map((entry) => [
        entry.name,
        {
          label: entry.name,
          color: entry.color || chartColors.grey,
        },
      ])
    ) as ChartConfig;
  }, [stats]);

  return (
    <>
      <div className="space-y-6">
        <section className="flex flex-col gap-2">
          {/* Header */}
          <div className="flex flex-wrap justify-between items-center gap-5 md:items-start">
            <h1 className="text-3xl font-bold tracking-tight text-[#6D1C24]">
              Welcome, {clerkUser?.firstName}
            </h1>
            <div className="flex flex-col-reverse gap-2 justify-between items-center w-full sm:w-fit sm:flex-row sm:gap-5">
              <Button size={"sm"} asChild className="w-full sm:w-fit">
                <Link href="/dashboard/reports">
                  <BarChartIcon className="mr-2 h-4 w-4" /> View Reports
                </Link>
              </Button>
              <Button
                onClick={() => setIsCreateOpen(true)}
                size={"sm"}
                className="w-full sm:w-fit"
              >
                <Plus className="h-4 w-4" /> Create Ticket
              </Button>
            </div>
          </div>
          {/* Description */}
          <div className={`flex items-center justify-between gap-1 flex-wrap`}>
            <p className={`flex items-center justify-between gap-1 flex-wrap`}>
              System-wide overview and management
              {marketCenters.length === 1 ? " for" : ":"}
              {marketCenters &&
                marketCenters.length === 1 &&
                marketCenters.map((mc, index) => (
                  <span key={mc.id}>
                    {mc.name ? mc.name : `#${mc.id.slice(0, 8)}`}
                    {index < marketCenters.length - 1 && index < 1
                      ? ", "
                      : index === 1 && marketCenters.length === 3
                        ? " & "
                        : ""}
                  </span>
                ))}
            </p>
            {isEnterprise && marketCenters && marketCenters.length > 1 && (
              <Select
                value={selectedMarketCenter?.id || ""}
                onValueChange={(value) => {
                  const foundMarketCenter = marketCenters.find(
                    (mc) => mc.id == value
                  );
                  if (foundMarketCenter) {
                    setSelectedMarketCenter(foundMarketCenter);
                  } else {
                    setSelectedMarketCenter({ name: "all", id: "all" });
                  }
                }}
                disabled={
                  marketCentersLoading || isUsersLoading || ticketsLoading
                }
              >
                <SelectTrigger className="md:max-w-[50%]">
                  <SelectValue placeholder="Select a market center" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teams</SelectItem>

                  {marketCenters &&
                    marketCenters.length > 0 &&
                    marketCenters.map((mc) => {
                      if (!mc || !mc?.id) return null;
                      return (
                        <SelectItem key={mc.id} value={mc.id}>
                          {mc?.name ? mc.name : `#${mc.id.slice(0, 8)}`}
                        </SelectItem>
                      );
                    })}
                </SelectContent>
              </Select>
            )}
          </div>
          {/* Ratings */}
          <div className="flex flex-wrap gap-2 items-center text-sm text-muted-foreground font-medium">
            <ToolTip
              content="Ratings are based on all resolved tickets via survey responses"
              trigger={<InfoIcon className="size-3 text-primary" />}
            />
            <span className="flex items-center gap-1 md:mr-2">
              {marketCenters && marketCenters.length > 1
                ? `All Market Centers (${totalMarketCenters})`
                : marketCenters.length === 1
                  ? `${
                      marketCenters?.[0]?.name
                        ? marketCenters[0].name
                        : marketCenters?.[0]?.id
                          ? `#${marketCenters[0]?.id?.slice(0, 8)}`
                          : "your market center"
                    }`
                  : "No Market Centers found"}
              :
              <StarRating
                rating={displayRatings?.marketCenterAverageRating || 0}
                size={16}
              />
            </span>
            <span className="flex items-center gap-1 md:mr-2">
              All Users:
              <StarRating
                rating={displayRatings?.assigneeAverageRating || 0}
                size={16}
              />
            </span>
            <span className="flex items-center gap-1">
              All Tickets:
              <StarRating
                rating={displayRatings?.overallAverageRating || 0}
                size={16}
              />
            </span>
          </div>
        </section>

        {/* TOP STATS */}
        <section className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card
            className="cursor-pointer transition-colors hover:bg-muted/50"
            onClick={() => navigateToTicketsWithFilter("active")}
          >
            <CardHeader>
              <CardTitle className="text-center font-medium">
                Active Tickets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-2xl font-bold">
                {stats.openTicketsCount}
              </p>
              <p className="text-center text-xs text-muted-foreground">
                {stats.highPriority} high priority • {stats.unassignedTickets}{" "}
                unassigned
              </p>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer transition-colors hover:bg-muted/50"
            onClick={() => navigateToTicketsWithFilter("new")}
          >
            <CardHeader>
              <CardTitle className="text-center font-medium">
                New Tickets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-2xl font-bold">
                {stats.createdThisWeek}
              </p>
              <p className="text-center text-xs text-muted-foreground">
                in the last 7 days
              </p>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer transition-colors hover:bg-muted/50"
            onClick={() => navigateToTicketsWithFilter("overdue")}
          >
            <CardHeader>
              <CardTitle className="text-center font-medium">
                Overdue Tickets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-2xl font-bold">
                {stats.overdueTickets}
              </p>
              <p className="text-center text-xs text-muted-foreground">
                across all tickets
              </p>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer transition-colors hover:bg-muted/50"
            onClick={() => navigateToTicketsWithFilter("resolved")}
          >
            <CardHeader>
              <CardTitle className="text-center font-medium">
                Resolved Tickets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-2xl font-bold">
                {stats.resolvedThisWeek}
              </p>
              <p className="text-center text-xs text-muted-foreground">
                in the last 7 days
              </p>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 auto-cols-[minmax(0,2fr)] lg:grid-cols-2 place-content-evenly">
          {/* STAFF BREAKDOWN */}
          <Card>
            <CardHeader className="flex flex-row justify-between">
              <div className="flex flex-col gap-1">
                <CardTitle>Staff Breakdown</CardTitle>
                <CardDescription>
                  {stats.totalTeamMembers} total team{" "}
                  {stats.totalTeamMembers === 1 ? "member" : "members"}
                </CardDescription>
              </div>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-6 gap-2 px-1 pb-2 text-[10px] font-medium sm:text-sm text-muted-foreground border-b">
                <p className="col-span-2 pl-1 overflow-hidden text-ellipsis whitespace-nowrap ">
                  Name
                </p>
                <p className="text-center overflow-hidden text-ellipsis whitespace-nowrap">
                  Assigned
                </p>
                <p className="text-center overflow-hidden text-ellipsis whitespace-nowrap">
                  Active
                </p>
                <p className="text-center overflow-hidden text-ellipsis whitespace-nowrap">
                  Overdue
                </p>
                <p className="text-center overflow-hidden text-ellipsis whitespace-nowrap">
                  Resolved
                </p>
              </div>
              <ScrollArea className="space-y-4 md:h-50 overflow-y-auto">
                {isUsersLoading && (
                  <p className="space-y-4 text-sm text-muted-foreground pt-2 px-2">
                    Loading...
                  </p>
                )}
                {!isUsersLoading && Object.keys(staffStats).length === 0 && (
                  <p className="space-y-4 text-sm text-muted-foreground pt-2 px-2">
                    No staff members found
                  </p>
                )}

                {Object.entries(staffStats).map(
                  ([memberId, stats]: [string, any], index: number) => {
                    if (!memberId) return null;

                    return (
                      <div
                        key={memberId}
                        className={`grid grid-cols-6 gap-2 rounded text-[10px] sm:text-sm border-b px-1 pb-2 ${index === 0 && "pt-2"}`}
                      >
                        <Link
                          href={`/dashboard/users/${memberId}`}
                          className="col-span-2 font-medium hover:underline cursor-pointer"
                        >
                          <p className="overflow-hidden text-ellipsis whitespace-nowrap">
                            {stats?.name ? stats.name : memberId.slice(0, 8)}
                          </p>
                        </Link>
                        <p className="text-muted-foreground text-center">
                          {stats?.assigned}
                        </p>
                        <p className="text-muted-foreground text-center">
                          {stats?.active}
                        </p>
                        <p className="text-muted-foreground text-center">
                          {stats?.overdue}
                        </p>
                        <p className="text-muted-foreground text-center">
                          {stats?.resolved}
                        </p>
                      </div>
                    );
                  }
                )}
              </ScrollArea>

              <div className="mt-4">
                <Button asChild variant="outline" className="w-fit md:w-full">
                  <Link href="/dashboard/users">Manage Users</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* TICKETS BY USER */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-lg">Active Tickets by User</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground hidden sm:visible" />
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={ticketsByUserChartConfig}
                className="h-[220px] w-[99%] md:w-full mx-auto"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats?.ticketsByUser}
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

                      {stats?.ticketsByUser.map((entry, i) => (
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
                {stats?.ticketsByUser.map((entry) => (
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
          <Card>
            <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
              <div className="flex flex-col gap-1">
                <CardTitle>Tickets by Status</CardTitle>
                <CardDescription>
                  {stats.totalTickets} total tickets
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
            </CardContent>
          </Card>

          {/* RECENT TICKET ACTIVITY */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                {stats.totalTickets} total tickets
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="space-y-2 max-h-50 overflow-y-auto">
                {tickets.slice(0, 5).map((ticket: any) => (
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
        </section>

        {/* SLA COMPLIANCE */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>SLA Compliance</CardTitle>
              <CardDescription>
                Response time performance (last 30 days)
              </CardDescription>
            </div>
            <Link href="/dashboard/sla">
              <Button variant="outline" size="sm">
                <Clock className="h-4 w-4 mr-2" />
                View Details
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <p className="text-sm font-medium">Compliance Rate</p>
                <div className="flex items-baseline gap-2">
                  <span
                    className={`text-2xl font-bold ${slaMetricsData?.metrics ? getComplianceColor(slaMetricsData.metrics.complianceRate) : ""}`}
                  >
                    {slaMetricsData?.metrics
                      ? `${slaMetricsData.metrics.complianceRate.toFixed(1)}%`
                      : "N/A"}
                  </span>
                  {slaMetricsData?.metrics && (
                    <Badge
                      variant={
                        slaMetricsData.metrics.complianceRate >= 90
                          ? "success"
                          : slaMetricsData.metrics.complianceRate >= 75
                            ? "warning"
                            : "orange"
                      }
                    >
                      {slaMetricsData.metrics.complianceRate >= 90
                        ? "Excellent"
                        : slaMetricsData.metrics.complianceRate >= 75
                          ? "Fair"
                          : "Needs Improvement"}
                    </Badge>
                  )}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium">Tickets with SLA</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">
                    {slaMetricsData?.metrics?.ticketsWithSla ?? 0}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    of {slaMetricsData?.metrics?.totalTickets ?? 0} total
                  </span>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium">SLA Met</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-green-600">
                    {slaMetricsData?.metrics?.ticketsMet ?? 0}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium">SLA Breached</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-red-600">
                    {slaMetricsData?.metrics?.ticketsBreached ?? 0}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create Ticket Modal */}
      <CreateTicketForm
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={async (created) => {
          setIsCreateOpen(false);
          await adminTicketsQueryInvalidator();
        }}
      />
    </>
  );
}
