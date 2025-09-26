"use client";

import { useStore } from "@/app/store-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TicketTabs } from "@/components/ui/tabs/ticket-tabs";
import {
  useFetchMarketCenter,
  useFetchMarketCenterTickets,
} from "@/hooks/use-market-center";
import { Ticket, Users, TrendingUp, AlertCircle, Plus } from "lucide-react";
import Link from "next/link";

export function StaffDashboard() {
  const { currentUser } = useStore();

  const marketCenterId = currentUser?.marketCenterId
    ? currentUser?.marketCenterId
    : "";

  const { data: marketCenter, isLoading: marketCenterLoading } =
    useFetchMarketCenter(marketCenterId);

  const { data: ticketsData, isLoading: ticketsLoading } =
    useFetchMarketCenterTickets(marketCenterId);

  const tickets = ticketsData?.tickets || [];

  const stats = {
    totalTickets: ticketsData?.total || 0,
    openTickets: tickets.filter((t: any) => t.status !== "RESOLVED").length,
    highPriority: tickets.filter(
      (t: any) => t.urgency === "HIGH" && t.status !== "RESOLVED"
    ).length,
    unassigned: tickets.filter((t: any) => !t.assigneeId).length,
  };

  const teamMembers =
    marketCenter?.users && marketCenter?.users.length > 0
      ? marketCenter?.users
      : [];

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
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team Dashboard</h1>
          <p className="text-muted-foreground">
            Managing {marketCenter?.name || "your"} market center
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/tickets">
            <Plus className="mr-2 h-4 w-4" /> Create Ticket
          </Link>
        </Button>
      </div>

      <TicketTabs />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTickets}</div>
            <p className="text-xs text-muted-foreground">
              {stats.openTickets} open
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Priority</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.highPriority}</div>
            <p className="text-xs text-muted-foreground">
              Require immediate attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unassigned</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.unassigned}</div>
            <p className="text-xs text-muted-foreground">Need assignment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamMembers.length}</div>
            <p className="text-xs text-muted-foreground">Active members</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Tickets</CardTitle>
            <CardDescription>Latest tickets from your team</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {tickets.slice(0, 5).map((ticket: any) => (
                <div
                  key={ticket.id}
                  className="flex items-center justify-between p-2 rounded hover:bg-muted"
                >
                  <div className="flex-1">
                    <Link
                      href={`/dashboard/tickets/${ticket.id}`}
                      className="font-medium hover:underline"
                    >
                      {ticket.title}
                    </Link>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        #{ticket.id.substring(0, 8)}
                      </span>
                      <Badge
                        variant={
                          ticket.urgency === "HIGH"
                            ? "destructive"
                            : "secondary"
                        }
                        className="text-xs"
                      >
                        {ticket.urgency}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
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
            </div>
            <div className="mt-4">
              <Button asChild variant="outline" className="w-full">
                <Link href="/dashboard/tickets">View All Tickets</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Team Performance</CardTitle>
            <CardDescription>
              Ticket distribution across team members
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(teamStats)
                .slice(0, 5)
                .map(([memberId, stats]: [string, any]) => {
                  return (
                    <div
                      key={memberId}
                      className="flex items-center justify-between"
                    >
                      <div className="flex-1">
                        <p className="font-medium">
                          {stats.name} {memberId === currentUser?.id && "(You)"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {stats.assigned} active • {stats.resolved} resolved
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="secondary">{stats.assigned}</Badge>
                      </div>
                    </div>
                  );
                })}
              {Object.keys(teamStats).length === 0 && (
                <p className="text-muted-foreground text-center py-4">
                  No team data available
                </p>
              )}
            </div>
            <div className="mt-4">
              <Button asChild variant="outline" className="w-full">
                <Link href="/dashboard/settings?tab=team">Manage Team</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
