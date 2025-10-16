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
import {
  Ticket,
  Users,
  TrendingUp,
  AlertCircle,
  Plus,
  User,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { ScrollArea } from "../ui/scroll-area";

export function StaffDashboard() {
  const { currentUser } = useStore();

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

  const tickets = ticketsData?.tickets ?? [];

  const filteredTickets =
    selectedTeamMemberId == "All"
      ? tickets
      : tickets.filter((t: any) => t.assigneeID === selectedTeamMemberId);

  const stats = {
    totalTickets: filteredTickets?.length ?? 0,
    openTickets: filteredTickets.filter((t: any) => t.status !== "RESOLVED")
      .length,
    highPriority: filteredTickets.filter(
      (t: any) => t.urgency === "HIGH" && t.status !== "RESOLVED"
    ).length,
    unassigned: filteredTickets.filter((t: any) => !t.assigneeId).length,
  };

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
      <div className="flex flex-wrap justify-between items-center gap-5 md:items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team Dashboard</h1>
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
            <div className="space-y-2 md:h-100">
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
            <ScrollArea className="space-y-4 md:h-100">
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
