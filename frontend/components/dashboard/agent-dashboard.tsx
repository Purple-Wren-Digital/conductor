"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AgentTicketList from "@/components/ui/tickets/ticket-dashboard/ticket-list-agent";
import { useQuery } from "@tanstack/react-query";
import { useAuth, useUser } from "@clerk/nextjs";
import { useStore } from "@/context/store-provider";
import { API_BASE } from "@/lib/api/utils";
import type { Ticket } from "@/lib/types";
import { statusOptions } from "@/lib/utils";

export function AgentDashboard() {
  const { user: clerkUser } = useUser();
  const { getToken } = useAuth();
  const { currentUser } = useStore();
  const router = useRouter();

  const navigateToTicketsWithFilter = useCallback(
    (filterType: "active" | "new" | "overdue" | "resolved") => {
      router.push(`/dashboard/tickets?filter=${filterType}`);
    },
    [router]
  );

  const { data: ticketsData, isLoading } = useQuery({
    queryKey: ["agent-tickets", currentUser?.email],
    queryFn: async () => {
      if (!currentUser) throw new Error("Not logged in");
      const token = await getToken();
      if (!token) throw new Error("No authentication token");
      const queryParams = new URLSearchParams();
      statusOptions.forEach((option) => {
        queryParams.append("status", option);
      });
      const response = await fetch(
        `${API_BASE}/tickets?${queryParams.toString()}`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!response.ok) throw new Error("Failed to fetch tickets");
      return await response.json();
    },
    enabled: !!currentUser,
  });
  const tickets: Ticket[] = useMemo(() => {
    return ticketsData?.tickets ?? [];
  }, [ticketsData]);
  const ticketTotal: number = ticketsData?.total ?? 0;

  const stats = useMemo(() => {
    const highPriority = tickets.filter(
      (t: Ticket) => t.urgency === "HIGH"
    ).length;

    const activeTickets = tickets.filter(
      (t: Ticket) => t.status !== "RESOLVED"
    ).length;

    const overdueTickets = tickets.filter((t: Ticket) => {
      if (t.status !== "RESOLVED" && t?.dueDate) {
        const dueDate = new Date(t.dueDate);
        const now = new Date();
        return dueDate < now;
      }
      return false;
    }).length;

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
      highPriority,
      createdThisWeek,
      activeTickets,
      overdueTickets,
      resolvedThisWeek,
    };
  }, [tickets]);

  if (isLoading) {
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[#6D1C24]">
          Welcome, {clerkUser?.firstName}
        </h1>
        <p className="text-muted-foreground">Manage your assigned tickets</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        <Card
          className="cursor-pointer transition-colors hover:bg-muted/50"
          onClick={() => navigateToTicketsWithFilter("active")}
        >
          <CardHeader>
            <CardTitle className="font-medium text-center">
              Active Tickets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-center">
              {stats.activeTickets}
            </p>
            <p className="text-center text-xs text-muted-foreground">
              {stats.highPriority} high priority
            </p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer transition-colors hover:bg-muted/50"
          onClick={() => navigateToTicketsWithFilter("new")}
        >
          <CardHeader>
            <CardTitle className="font-medium text-center">
              New Tickets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-center">
              {stats.createdThisWeek}
            </div>
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
            <CardTitle className="font-medium text-center">
              Overdue Tickets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-center">
              {stats.overdueTickets}
            </div>
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
      </div>

      <AgentTicketList />
    </div>
  );
}
