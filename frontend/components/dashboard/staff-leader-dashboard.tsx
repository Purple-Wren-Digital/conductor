"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useStore } from "@/context/store-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StarRating } from "@/components/ui/ratingInput/star-rating-static";
import { ToolTip } from "@/components/ui/tooltip/tooltip";
import { useFetchMarketCenter } from "@/hooks/use-market-center";
import {
  useFetchRatingsByMarketCenter,
  useFetchStaffTickets,
} from "@/hooks/use-tickets";
import {
  Users,
  Plus,
  Activity,
  TrendingUp,
  TicketIcon,
  InfoIcon,
} from "lucide-react";
import Link from "next/link";
import type { ConductorUser, SurveyResults, Ticket } from "@/lib/types";
import { calculateStaffStats } from "@/lib/utils/staff-stats";
import {
  chartColors,
  sortByRoleThenName,
  STATUS_COLORS,
  STATUS_LABELS,
  STATUS_ORDER,
  StatusKey,
  statusOptions,
  ticketByStatusChartConfig,
} from "@/lib/utils";
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
import { useQueryClient } from "@tanstack/react-query";

export function StaffLeaderDashboard() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTeamMemberId, setSelectedTeamMemberId] = useState("All");

  const router = useRouter();
  const queryClient = useQueryClient();
  const { currentUser } = useStore();
  const { user: clerkUser } = useUser();

  const navigateToTicketsWithFilter = useCallback(
    (filterType: "active" | "new" | "overdue" | "resolved") => {
      router.push(`/dashboard/tickets?filter=${filterType}`);
    },
    [router]
  );

  const marketCenterId = currentUser?.marketCenterId
    ? currentUser?.marketCenterId
    : "";

  const { data: marketCenter, isLoading: marketCenterLoading } =
    useFetchMarketCenter(currentUser?.role, marketCenterId);

  const queryKeyRatingsByMarketCenter = [
    "staff-leader-dashboard-ratings-by-market-center",
    marketCenterId,
  ];
  const { data: ratingsData, isLoading: marketCenterRatingsLoading } =
    useFetchRatingsByMarketCenter(
      queryKeyRatingsByMarketCenter,
      marketCenterId
    );

  const marketCenterRatings: SurveyResults = useMemo(() => {
    return ratingsData;
  }, [ratingsData]);

  const teamMembers: ConductorUser[] = useMemo(() => {
    return marketCenter?.users && marketCenter?.users.length > 0
      ? marketCenter?.users.sort(sortByRoleThenName)
      : [];
  }, [marketCenter]);

  const queryParams = useMemo(() => {
    const queryParams = new URLSearchParams();
    statusOptions.forEach((option) => {
      queryParams.append("status", option);
    });
    return queryParams;
  }, []);
  const queryKeyParams = useMemo(
    () => Object.fromEntries(queryParams.entries()) as Record<string, string>,
    [queryParams]
  );

  const staffTicketsQueryKey = useMemo(
    () => ["staff-tickets-dashboard", queryKeyParams] as const,
    [queryKeyParams]
  );

  const { data: ticketsData, isLoading: ticketsLoading } = useFetchStaffTickets(
    {
      queryParams,
      staffTicketsQueryKey,
      hydrated: true,
    }
  );
  const staffLeaderInvalidateTicketsQuery = () =>
    queryClient.invalidateQueries({
      queryKey: ["market-center-tickets", marketCenterId, queryParams],
    });

  const tickets = useMemo(() => {
    return ticketsData?.tickets ?? [];
  }, [ticketsData]);

  const filteredTickets: Ticket[] = useMemo(() => {
    return selectedTeamMemberId == "All"
      ? tickets
      : tickets.filter((t: any) => t.assigneeId === selectedTeamMemberId);
  }, [selectedTeamMemberId, tickets]);

  const stats = useMemo(() => {
    const totalTeamMembers = teamMembers.filter(
      (m: any) => m?.role && m.role !== "AGENT"
    ).length;
    const totalTickets = filteredTickets.length;
    const activeTicketsCount = filteredTickets.filter(
      (t: Ticket) => t.status !== "RESOLVED"
    ).length;
    const activeTickets = filteredTickets.filter(
      (t: Ticket) => t.status !== "RESOLVED"
    );
    const highPriority = filteredTickets.filter(
      (t: Ticket) => t.urgency === "HIGH" && t.status !== "RESOLVED"
    ).length;
    const unassignedTickets = filteredTickets.filter(
      (t: Ticket) =>
        t.status === "UNASSIGNED" || (t.status === "CREATED" && !t?.assigneeId)
    ).length;

    const overdueTickets = filteredTickets.filter((t: Ticket) => {
      if (t.status !== "RESOLVED" && t?.dueDate) {
        const dueDate = new Date(t.dueDate);
        const now = new Date();
        return dueDate < now;
      }
      return false;
    }).length;

    const ticketsByStatus = filteredTickets.reduce(
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

    const now = new Date();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(now.getDate() - 7);

    let createdThisWeek = 0;
    let resolvedThisWeek = 0;

    filteredTickets.forEach((t: Ticket) => {
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

    const colorValues = Object.entries(chartColors)
      .filter(([key]) => key !== "grey")
      .map(([_, value]) => value);

    let colorIndex = 0;
    const colorMap: Record<string, string> = {};
    const ticketsByUser: Record<
      string,
      { name: string; color: string; count: number }
    > = activeTickets.reduce(
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

    return {
      totalTeamMembers,
      totalTickets,
      activeTicketsCount,
      activeTickets,
      highPriority,
      unassignedTickets,
      overdueTickets,
      createdThisWeek,
      resolvedThisWeek,
      ticketsByStatus,
      ticketsByUser: Object.values(ticketsByUser),
    };
  }, [filteredTickets, teamMembers]);

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

  if (ticketsLoading || marketCenterLoading) {
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
    <>
      <div className="space-y-4">
        <section className="flex flex-col gap-2">
          <div className="flex flex-wrap justify-between items-center gap-5 md:items-start">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-[#6D1C24]">
                Welcome, {clerkUser?.firstName}
              </h1>
              <p className="text-muted-foreground">
                Managing {`${marketCenter?.name || "your"} market center`}
              </p>
            </div>
            <div className="flex flex-col-reverse gap-2 justify-between items-center w-full sm:w-fit sm:flex-row sm:gap-5">
              <Select
                value={selectedTeamMemberId}
                onValueChange={(value) => setSelectedTeamMemberId(value)}
              >
                <SelectTrigger className="w-full sm:w-[250px]">
                  <SelectValue placeholder="Select Team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">
                    <Users className="w-4 h-4" />
                    All Team Members
                  </SelectItem>
                  {teamMembers &&
                    teamMembers?.length &&
                    teamMembers?.map((member: any) => {
                      return (
                        <SelectItem key={member.id} value={member.id}>
                          <span className="font-medium">{member.name}:</span>
                          <span className="hidden md:block text-muted-foreground capitalize">
                            {member.role
                              ? member.role.split("_").join(" ").toLowerCase()
                              : "No role"}
                          </span>
                        </SelectItem>
                      );
                    })}
                </SelectContent>
              </Select>

              <Button
                className="w-full sm:w-fit"
                onClick={() => setIsCreateOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" /> Create Ticket
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 items-center text-sm text-muted-foreground font-medium">
            <ToolTip
              content="Ratings are based on resolved tickets within this market center via survey responses"
              trigger={<InfoIcon className="size-3 text-primary" />}
            />
            <span className="flex items-center gap-1 md:mr-2">
              {marketCenter?.name || "Market Center"}:
              <StarRating
                rating={marketCenterRatings?.marketCenterAverageRating || 0}
                size={16}
              />
            </span>
            <span className="flex items-center gap-1 md:mr-2">
              All Team Members:
              <StarRating
                rating={marketCenterRatings?.assigneeAverageRating || 0}
                size={16}
              />
            </span>
            <span className="flex items-center gap-1">
              All Tickets:
              <StarRating
                rating={marketCenterRatings?.overallAverageRating || 0}
                size={16}
              />
            </span>
          </div>
          {/* </div> */}
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
                {stats.activeTicketsCount}
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
          {/* TEAM MEMBERS */}
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
              <div className="grid grid-cols-6 font-medium pb-1 text-[10px] sm:text-sm text-muted-foreground border-b">
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
              <ScrollArea className="space-y-2 md:h-50 overflow-y-auto">
                {Object.entries(staffStats).map(
                  ([memberId, stats]: [string, any], index: number) => (
                    <div
                      key={memberId}
                      className={`grid grid-cols-6 gap-2 rounded text-[10px] sm:text-sm border-b px-1 pb-2 ${index === 0 && "pt-2"}`}
                    >
                      <Link
                        href={`/dashboard/users/${memberId}`}
                        className="font-medium hover:underline cursor-pointer col-span-2"
                      >
                        <p className="overflow-hidden text-ellipsis whitespace-nowrap">
                          {stats.name}
                        </p>
                      </Link>
                      <p className="text-muted-foreground text-center">
                        {stats.assigned}
                      </p>
                      <p className="text-muted-foreground text-center">
                        {stats.active}
                      </p>
                      <p className="text-muted-foreground text-center">
                        {stats.overdue}
                      </p>
                      <p className="text-muted-foreground text-center">
                        {stats.resolved}
                      </p>
                    </div>
                  )
                )}
                {Object.keys(staffStats).length === 0 && (
                  <p className="text-muted-foreground text-center py-4">
                    No staff data available
                  </p>
                )}
              </ScrollArea>
              <div className="mt-4">
                <Button
                  asChild
                  variant="outline"
                  className="w-full"
                  disabled={!currentUser || !currentUser?.marketCenterId}
                >
                  <Link
                    href={`/dashboard/marketCenters/${currentUser?.marketCenterId}?tab=team`}
                  >
                    Manage Team
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
          {/* TICKETS BY USER */}
          <Card>
            <CardHeader className="flex flex-row justify-between">
              <div className="flex flex-col gap-1">
                <CardTitle>Active Tickets by User</CardTitle>
                <CardDescription>
                  {stats.activeTicketsCount} active tickets
                </CardDescription>
              </div>
              <TicketIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={ticketsByUserChartConfig}
                className="h-[250px] md:h-[220px] md:w-full mx-auto"
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
            <CardHeader className="flex flex-row justify-between">
              <div className="flex flex-col gap-1">
                <CardTitle>Tickets by Status</CardTitle>
                <CardDescription>
                  {stats.totalTickets ?? "0"} total tickets
                </CardDescription>
              </div>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-2 ">
              <ChartContainer
                config={ticketByStatusChartConfig}
                className="h-[250px] md:h-[220px] md:w-full mx-auto"
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

          {/* RECENT ACTIVITY */}
          <Card>
            <CardHeader className="flex flex-row flex-wrap justify-between">
              <div className="flex flex-col gap-1">
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest tickets from your team</CardDescription>
              </div>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <ScrollArea className="space-y-2 max-h-50 overflow-y-auto">
                {!ticketsLoading && (!tickets || !tickets?.length) && (
                  <p className="text-sm font-medium text-muted-foreground">
                    No tickets found
                  </p>
                )}
                {!ticketsLoading &&
                  tickets &&
                  tickets?.length > 0 &&
                  tickets.slice(0, 10).map((ticket: any) => (
                    <div
                      key={ticket.id}
                      className="flex items-center p-2 rounded hover:bg-muted"
                    >
                      <div className="flex-1">
                        <Link
                          href={`/dashboard/tickets/${ticket.id}`}
                          className="hover:underline"
                        >
                          <p className="font-medium ">{ticket.title}</p>
                        </Link>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            #{ticket.id.substring(0, 8)}
                          </span>
                          <Badge
                            variant={ticket.urgency.toLowerCase() as any}
                            className="text-xs"
                          >
                            {ticket.urgency}
                          </Badge>
                          <Badge
                            variant={ticket.status.toLowerCase() as any}
                            className="text-xs"
                          >
                            {ticket.status.replace("_", " ")}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                {tickets.length === 0 && (
                  <p className="text-muted-foreground text-center py-4">
                    No tickets yet
                  </p>
                )}
              </ScrollArea>
              <div className="mt-4">
                <Button asChild variant="outline" className="w-full">
                  <Link href="/dashboard/tickets">View All Tickets</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
      <CreateTicketForm
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={async (created) => {
          setIsCreateOpen(false);
          await staffLeaderInvalidateTicketsQuery();
        }}
      />
    </>
  );
}
