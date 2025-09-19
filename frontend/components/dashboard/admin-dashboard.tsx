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
import { useUserRole } from "@/lib/hooks/use-user-role";
import {
  Building,
  Ticket,
  Users,
  TrendingUp,
  AlertCircle,
  BarChart,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { TicketTabs } from "../ui/tabs/ticket-tabs";

export function AdminDashboard() {
  const [selectedMarketCenter, setSelectedMarketCenter] =
    useState<string>("all");

  const { data: ticketsData, isLoading: ticketsLoading } = useQuery({
    queryKey: ["all-tickets"],
    queryFn: async () => {
      const accessToken =
        process.env.NODE_ENV === "development"
          ? "local"
          : await getAccessToken();
      const response = await fetch(`/api/tickets/search`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch tickets");
      return response.json();
    },
  });

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

  const { data: marketCenters } = useQuery({
    queryKey: ["market-centers"],
    queryFn: async () => {
      const accessToken =
        process.env.NODE_ENV === "development"
          ? "local"
          : await getAccessToken();
      const response = await fetch(`/api/market-centers`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (!response.ok) return { marketCenters: [] };
      return response.json();
    },
  });

  const tickets = ticketsData?.tickets || [];
  const allUsers = usersData?.users || [];

  const filteredTickets =
    selectedMarketCenter === "all"
      ? tickets
      : tickets.filter((t: any) => {
          const creator = allUsers.find((u: any) => u.id === t.creatorId);
          return creator?.marketCenterId === selectedMarketCenter;
        });

  const filteredUsers =
    selectedMarketCenter === "all"
      ? allUsers
      : allUsers.filter((u: any) => u.marketCenterId === selectedMarketCenter);

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
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            System-wide overview and management
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <Select
            value={selectedMarketCenter}
            onValueChange={setSelectedMarketCenter}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select Team" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teams</SelectItem>
              {marketCenters?.marketCenters?.map((mc: any) => (
                <SelectItem key={mc.id} value={mc.id}>
                  {mc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button asChild>
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
              Require immediate attention
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
            <CardTitle>Market Centers Performance</CardTitle>
            <CardDescription>Ticket distribution by team</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {marketCenters?.marketCenters?.slice(0, 5).map((mc: any) => {
                const mcTickets = tickets.filter((t: any) => {
                  const creator = allUsers.find(
                    (u: any) => u.id === t.creatorId
                  );
                  return creator?.marketCenterId === mc.id;
                });
                const mcOpen = mcTickets.filter(
                  (t: any) => t.status !== "RESOLVED"
                ).length;
                const mcTotal = mcTickets.length;

                return (
                  <div
                    key={mc.id}
                    className="flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{mc.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {mcOpen} open • {mcTotal} total
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="secondary">{mcOpen}</Badge>
                      <Badge variant="outline">{mcTotal}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4">
              <Button asChild variant="outline" className="w-full">
                <Link href="/dashboard/settings">Manage Teams</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest tickets across all teams</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
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
                <Badge variant="secondary">Good</Badge>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium">Active Teams</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">
                  {marketCenters?.marketCenters?.length || 0}
                </span>
                <Building className="h-4 w-4 text-muted-foreground" />
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
