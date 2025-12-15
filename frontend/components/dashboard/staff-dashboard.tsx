"use client";

import { use, useMemo, useState } from "react";
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
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ToolTip } from "@/components/ui/tooltip/tooltip";
import {
  useFetchMarketCenter,
  useFetchMarketCenterTickets,
} from "@/hooks/use-market-center";
import {
  Users,
  Plus,
  User,
  TrendingUp,
  TicketIcon,
  UserX,
  InfoIcon,
} from "lucide-react";
import Link from "next/link";
import type { SurveyResults, Ticket } from "@/lib/types";
import {
  STATUS_COLORS,
  STATUS_LABELS,
  STATUS_ORDER,
  StatusKey,
  statusOptions,
  ticketByStatusChartConfig,
  urgencyChartConfig,
  urgencyOptions,
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
import { StarRating } from "../ui/ratingInput/star-rating-static";
import { useFetchRatingsByAssignee } from "@/hooks/use-tickets";

export function StaffDashboard() {
  const { currentUser } = useStore();
  const [selectedTeamMemberId, setSelectedTeamMemberId] = useState("All");

  const { user: clerkUser } = useUser();

  const shouldFetchRatings = (currentUser?._count?.assignedTickets ?? 0) > 0;

  const { data: userRatingsData, isLoading: ratingsLoading } =
    useFetchRatingsByAssignee(
      ["ratings-by-assignee", currentUser?.id || ""],
      shouldFetchRatings,
      currentUser?.id || ""
    );

  const userAvgRatings: SurveyResults = useMemo(() => {
    return userRatingsData;
  }, [userRatingsData]);

  const marketCenterId = currentUser?.marketCenterId
    ? currentUser?.marketCenterId
    : "";

  const { data: marketCenter, isLoading: marketCenterLoading } =
    useFetchMarketCenter(currentUser?.role, marketCenterId);

  const queryParams = useMemo(() => {
    const queryParams = new URLSearchParams();
    statusOptions.forEach((option) => {
      queryParams.append("status", option);
    });
    return queryParams;
  }, []);

  const { data: ticketsData, isLoading: ticketsLoading } =
    useFetchMarketCenterTickets({
      marketCenterId,
      queryParams,
      queryKeyParams: null,
    });

  const tickets = useMemo(() => {
    return ticketsData?.tickets ?? [];
  }, [ticketsData]);

  const filteredTickets = useMemo(() => {
    return selectedTeamMemberId === currentUser?.id
      ? tickets.filter((t: Ticket) => t.assigneeId === selectedTeamMemberId)
      : selectedTeamMemberId === "Unassigned"
        ? tickets.filter((t: Ticket) => !t.assigneeId)
        : tickets;
  }, [currentUser?.id, selectedTeamMemberId, tickets]);

  const stats = useMemo(() => {
    const totalTickets = filteredTickets.length;
    const activeTicketsCount: number = filteredTickets.filter(
      (t: Ticket) => t.status !== "RESOLVED"
    ).length;
    const activeTickets: Ticket[] = filteredTickets.filter(
      (t: Ticket) => t.status !== "RESOLVED"
    );
    const highPriority = filteredTickets.filter(
      (t: Ticket) => t.urgency === "HIGH" && t.status !== "RESOLVED"
    ).length;
    const unassignedTickets = filteredTickets.filter(
      (t: Ticket) => !t.assigneeId
    ).length;
    const ticketsByStatus = filteredTickets.reduce(
      (acc: Record<string, number>, ticket: Ticket) => {
        acc[ticket.status] = (acc[ticket.status] || 0) + 1;
        return acc;
      },
      {}
    );

    const ticketsByUrgency = activeTickets.reduce(
      (acc: Record<string, number>, ticket: Ticket) => {
        acc[ticket.urgency] = (acc[ticket.urgency] || 0) + 1;
        return acc;
      },
      {}
    );

    const overdueTickets = filteredTickets.filter((t: Ticket) => {
      if (t.status !== "RESOLVED" && t?.dueDate) {
        const dueDate = new Date(t.dueDate);
        const now = new Date();
        return dueDate < now;
      }
      return false;
    }).length;

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

    return {
      totalTickets,
      activeTicketsCount,
      activeTickets,
      highPriority,
      unassignedTickets,
      overdueTickets,
      createdThisWeek,
      resolvedThisWeek,
      ticketsByStatus,
      ticketsByUrgency,
    };
  }, [filteredTickets]);

  const statusChartData = useMemo(() => {
    if (!stats) return [];
    return STATUS_ORDER.map((key) => ({
      status: key,
      count: stats.ticketsByStatus[key] ?? 0,
      fill: STATUS_COLORS[key],
    }));
  }, [stats]);

  const urgencyChartData = useMemo(() => {
    if (!stats) return [];
    return urgencyOptions.map((key) => ({
      label: urgencyChartConfig[key].label,
      count: stats.ticketsByUrgency[key] ?? 0,
      fill: urgencyChartConfig[key].color,
    }));
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
    <div className="space-y-4">
      <section className="flex flex-col gap-2">
        <div className="flex flex-wrap justify-between items-center gap-5 md:items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#6D1C24]">
              Welcome, {clerkUser?.firstName}
            </h1>
            <p className="text-muted-foreground">
              Managing your assigned tickets within{" "}
              {marketCenter?.name ?? "your"} market center
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
                  All
                </SelectItem>
                <SelectItem value={currentUser?.id ?? "impossible-id"}>
                  <User className={`w-4 h-4`} />
                  {currentUser?.name}
                </SelectItem>
                <SelectItem value={"Unassigned"}>
                  <UserX className={`w-4 h-4`} />
                  Unassigned
                </SelectItem>
              </SelectContent>
            </Select>

            <Button asChild className="w-full sm:w-fit">
              <Link href="/dashboard/tickets">
                <Plus className="mr-2 h-4 w-4" /> Create Ticket
              </Link>
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 items-center text-sm text-muted-foreground font-medium">
          <ToolTip
            content="Ratings are based on your resolved tickets via survey responses"
            trigger={<InfoIcon className="size-3 text-primary" />}
          />
          <div className="flex flex-wrap gap-4 items-center text-sm text-muted-foreground font-medium">
            <span className="flex items-center gap-1">
              {clerkUser?.firstName ? `${clerkUser?.firstName}'s` : "Your"} Avg{" "}
              Rating:
              <StarRating
                rating={userAvgRatings?.assigneeAverageRating || 0}
                size={16}
              />
            </span>
            <span className="flex items-center gap-1">
              Tickets Overall:
              <StarRating
                rating={userAvgRatings?.overallAverageRating || 0}
                size={16}
              />
            </span>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
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
              unassigned{" "}
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
            <p className="text-center text-2xl font-bold">
              {stats.createdThisWeek}
            </p>
            <p className="text-center text-xs text-muted-foreground">
              in the last 7 days
            </p>
          </CardContent>
        </Card>

        <Card>
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

        <Card>
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
      </div>

      <div className="grid gap-4 lg:grid-cols-2 justify-center">
        {/* TICKETS BY STATUS*/}
        <Card className="max-w-2xs sm:max-w-full">
          <CardHeader className="flex flex-row justify-between">
            <div className="flex flex-col gap-1">
              <CardTitle>Tickets by Status</CardTitle>
              <CardDescription>
                {stats.totalTickets} total tickets
              </CardDescription>
            </div>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="h-[250px] md:h-[220px]">
            <ChartContainer
              config={ticketByStatusChartConfig}
              className="h-4/5 w-[99%] md:w-full mx-auto"
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
        <Card className="max-w-2xs sm:max-w-full row-span-2">
          <CardHeader className="flex flex-row flex-wrap justify-between">
            <div className="flex flex-col gap-1">
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Recently created or updated tickets
              </CardDescription>
            </div>
            <Button asChild variant="outline" className="w-fit">
              <Link href="/dashboard/tickets">View All Tickets</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <ScrollArea className="space-y-2 max-h-[600px] overflow-y-auto">
              {!tickets && !tickets?.length && (
                <p className="text-sm font-medium text-muted-foreground">
                  No tickets found
                </p>
              )}
              {tickets &&
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
          </CardContent>
        </Card>
        {/* TICKETS BY URGENCY */}
        <Card className="max-w-2xs sm:max-w-full">
          <CardHeader className="flex flex-row justify-between">
            <div className="flex flex-col gap-1">
              <CardTitle>Active Tickets by Urgency</CardTitle>
              <CardDescription>
                {stats?.activeTicketsCount ?? "0"} active tickets
              </CardDescription>
            </div>
            <TicketIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="h-fit">
            <ChartContainer
              config={urgencyChartConfig}
              className="h-[220px] w-[99%] md:w-full mx-auto"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={urgencyChartData}
                    dataKey="count"
                    nameKey="label"
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

                    {urgencyChartData.map((entry, i) => (
                      <Cell key={`urg-cell-${i}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const { label, count, fill } = payload[0].payload;
                        return (
                          <div className="border border-border/50 px-2.5 py-1.5 bg-background shadow-xl rounded-md min-w-[8rem]">
                            <p className="font-medium text-xs">{label}</p>
                            <div className="flex items-center gap-2">
                              <div
                                className={`h-2.5 w-2.5 rounded`}
                                style={{ backgroundColor: fill }}
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
              {urgencyChartData.map((entry) => (
                <div key={entry.label} className="flex items-center gap-0.75">
                  <span
                    className="w-1.5 h-1.5 rounded-md"
                    style={{ backgroundColor: entry.fill }}
                  />
                  <span className="text-xs font-medium">{entry.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
