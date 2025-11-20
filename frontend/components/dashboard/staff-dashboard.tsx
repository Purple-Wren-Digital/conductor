"use client";

import { useMemo, useState } from "react";
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
  useFetchMarketCenter,
  useFetchMarketCenterTickets,
} from "@/hooks/use-market-center";
import { Users, Plus, User, Activity } from "lucide-react";
import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { ScrollArea } from "../ui/scroll-area";
import type { Ticket } from "@/lib/types";
import { getResolvedInBusinessDays } from "@/lib/utils";

export function StaffDashboard() {
  const { currentUser } = useStore();
  const { user: clerkUser } = useUser();

  const [selectedTeamMemberId, setSelectedTeamMemberId] = useState("All");

  const marketCenterId = currentUser?.marketCenterId
    ? currentUser?.marketCenterId
    : "";

  const { data: marketCenter, isLoading: marketCenterLoading } =
    useFetchMarketCenter(currentUser?.role, marketCenterId);

  const teamMembers =
    marketCenter?.users && marketCenter?.users.length > 0
      ? marketCenter?.users
      : [];

  const { data: ticketsData, isLoading: ticketsLoading } =
    useFetchMarketCenterTickets({
      marketCenterId,
      queryParams: null,
      queryKeyParams: null,
    });

  const tickets = useMemo(() => {
    return ticketsData?.tickets ?? [];
  }, [ticketsData]);

  const filteredTickets =
    selectedTeamMemberId == "All"
      ? tickets
      : tickets.filter((t: any) => t.assigneeId === selectedTeamMemberId);

  const stats = useMemo(() => {
    const totalTickets = tickets.length;
    const activeTickets = tickets.filter(
      (t: Ticket) => t.status !== "RESOLVED"
    ).length;
    const resolvedTicketsCount = tickets.filter(
      (t: Ticket) => t.status === "RESOLVED"
    ).length;
    const highPriority = tickets.filter(
      (t: Ticket) => t.urgency === "HIGH" && t.status !== "RESOLVED"
    ).length;
    const unassignedTickets = tickets.filter(
      (t: Ticket) => !t.assigneeId
    ).length;

    const now = new Date();
    const oneWeekAgo = new Date();
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
      activeTickets,
      resolvedTicketsCount,
      highPriority,
      unassignedTickets,
      avgResolutionBusinessDays,
      newTickets,
    };
  }, [filteredTickets, tickets]);

  const teamStats = teamMembers.reduce((acc: any, member: any) => {
    const memberTickets = tickets.filter(
      (t: any) => t.assigneeId === member.id
    );

    acc[member.id] = {
      name: member.name,
      assigned: memberTickets.filter((t: any) => t.status !== "RESOLVED")
        .length,
      resolved: memberTickets.filter((t: any) => t.status === "RESOLVED")
        .length,
    };
    return acc;
  }, {});

  // const urgencyChartData = useMemo(() => {
  //   if (!stats) return [];
  //   return URGENCY_ORDER.map((key) => ({
  //     urgency: key,
  //     count: stats.ticketsByUrgency[key] ?? 0,
  //     fill: URGENCY_COLORS[key],
  //   }));
  // }, [stats]);

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
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-5 md:items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--conductor)]">
            Welcome, {clerkUser?.firstName}
          </h1>
          <p className="text-muted-foreground">
            Managing {marketCenter?.name || "your"} market center
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
                teamMembers?.map((mc: any) => {
                  return (
                    <SelectItem key={mc.id} value={mc.id}>
                      <User className="w-4 h-4" />
                      {mc.name}
                    </SelectItem>
                  );
                })}
            </SelectContent>
          </Select>

          <Button asChild className="w-full sm:w-fit">
            <Link href="/dashboard/tickets">
              <Plus className="mr-2 h-4 w-4" /> Create Ticket
            </Link>
          </Button>
        </div>
      </div>

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
              {stats.activeTickets}
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
        <Card className="h-fit">
          <CardHeader className="flex flex-row justify-between">
            <div className="flex flex-col gap-1">
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest tickets from your team</CardDescription>
            </div>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <ScrollArea className="space-y-2 md:max-h-100 overflow-y-auto">
              {!tickets && !tickets?.length && (
                <p className="text-sm font-medium text-muted-foreground">
                  No tickets found
                </p>
              )}
              {tickets &&
                tickets?.length > 0 &&
                tickets.slice(0, 5).map((ticket: any) => (
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

        <Card className="h-fit">
          <CardHeader className="flex flex-row justify-between">
            <div className="flex flex-col gap-1">
              <CardTitle>Team Members</CardTitle>
              <CardDescription>
                Ticket distribution across {teamMembers.length} team members
              </CardDescription>
            </div>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <ScrollArea className="space-y-4 md:max-h-100 overflow-y-auto">
              {Object.entries(teamStats).map(
                ([memberId, stats]: [string, any]) => {
                  const isViewingStats = selectedTeamMemberId === memberId;
                  return (
                    <div
                      key={memberId}
                      className={`flex flex-col p-2 rounded hover:bg-muted ${isViewingStats && "bg-muted"}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium hover:underline">
                            {stats.name}{" "}
                            {memberId === currentUser?.id && "(You)"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {stats.assigned} active • {stats.resolved} resolved
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Badge
                            variant={isViewingStats ? "outline" : "secondary"}
                          >
                            {stats.assigned}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  );
                }
              )}
              {Object.keys(teamStats).length === 0 && (
                <p className="text-muted-foreground text-center py-4">
                  No team data available
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
      </div>
    </div>
  );
}
