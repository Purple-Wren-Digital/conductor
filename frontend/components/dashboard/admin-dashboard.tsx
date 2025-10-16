"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { getAccessToken } from "@auth0/nextjs-auth0";
import {
  AlertCircle,
  BarChart,
  Building2,
  Ticket,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMemo, useState } from "react";
import { TicketTabs } from "../ui/tabs/ticket-tabs";
import { useFetchAllMarketCenters } from "@/hooks/use-market-center";
import { useUserRole } from "@/hooks/use-user-role";
import { useFetchAdminTickets } from "@/hooks/use-tickets";
import { TeamSwitcher } from "../ui/team-switcher";
import { ScrollArea } from "@radix-ui/react-scroll-area";

export function AdminDashboard() {
  const { role } = useUserRole();
  const [selectedMarketCenterId, setSelectedMarketCenterId] =
    useState<string>("all");

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (selectedMarketCenterId !== "all") {
      params.append("marketCenterId", selectedMarketCenterId);
    }
    return params;
  }, [selectedMarketCenterId, role]);

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
    }
  );

  const { data: usersData } = useQuery({
    queryKey: ["all-users"],
    queryFn: async () => {
      const accessToken =
        process.env.NODE_ENV === "development"
          ? "local"
          : await getAccessToken();
      const response = await fetch(`/api/users`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch users");
      return response.json();
    },
  });

  const { data: marketCentersData, isLoading: isLoadingMarketCenters } =
    useFetchAllMarketCenters(role);
  const marketCenters = marketCentersData?.marketCenters ?? [];

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

  const stats = {
    totalTickets: filteredTickets.length,
    openTickets: filteredTickets.filter((t: any) => t.status !== "RESOLVED")
      .length,
    highPriority: filteredTickets.filter(
      (t: any) => t.urgency === "HIGH" && t.status !== "RESOLVED"
    ).length,
    totalUsers: filteredUsers.length,
    agents: filteredUsers.filter((u: any) => u.role === "AGENT").length,
    staff: filteredUsers.filter((u: any) => u.role === "STAFF").length,
    avgResponseTime: "2.4 hours",
    resolutionRate:
      Math.round(
        (filteredTickets.filter((t: any) => t.status === "RESOLVED").length /
          filteredTickets.length) *
          100
      ) || 0,
  };

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
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            System-wide overview and management
          </p>
        </div>
        <div className="flex flex-col-reverse gap-2 justify-between items-center w-full sm:w-fit sm:flex-row sm:gap-5">
          <div className="space-y-2 w-50 w-full sm:w-fit">
            <TeamSwitcher
              selectedMarketCenterId={selectedMarketCenterId}
              setSelectedMarketCenterId={setSelectedMarketCenterId}
            />
          </div>
          <Button asChild className="w-full sm:w-fit">
            <Link href="/dashboard/reports">
              <BarChart className="mr-2 h-4 w-4" /> View Reports
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
              {stats.openTickets} open • {stats.resolutionRate}% resolved
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
              Requires immediate attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {stats.agents} agents • {stats.staff} staff
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgResponseTime}</div>
            <p className="text-xs text-muted-foreground">First response time</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>
              Market Centers ({marketCenters?.length ?? "0"})
            </CardTitle>
            <CardDescription>Ticket distribution by team</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="space-y-4 md:h-100">
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
                  return (
                    <div
                      key={mc?.id}
                      onClick={() => setSelectedMarketCenterId(mc?.id)}
                      className={`flex flex-col p-2 rounded hover:bg-muted ${isViewingStats && "bg-muted"}`}
                    >
                      <div className="flex flex-1 justify-between">
                        <Link
                          href={`/dashboard/marketCenters/${mc.id}?tab=team`}
                          className="font-medium hover:underline cursor-pointer"
                        >
                          {mc?.name && mc.name}
                        </Link>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-muted-foreground">
                          #{mc?.id && mc.id.substring(0, 8)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Users: {mc?.users ? mc?.users.length : 0}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Categories: {mc?.ticketCategories ? mc?.length : 0}
                        </p>
                      </div>
                    </div>
                  );
                })}
            </ScrollArea>

            <div className="mt-4">
              <Button asChild variant="outline" className="w-full">
                <Link href="/dashboard/marketCenters">
                  Manage Market Centers
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              {filteredTickets.length ?? "0"} Total tickets
              {selectedMarketCenterId === "all" ? " across all teams" : ""}{" "}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 md:h-100">
              {filteredTickets.slice(0, 5).map((ticket: any) => (
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
                      {ticket.creator && (
                        <span className="text-xs text-muted-foreground">
                          by {ticket.creator.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Button asChild variant="outline" className="w-full">
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
