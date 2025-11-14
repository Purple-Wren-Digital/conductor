"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AgentTicketList from "@/components/ui/tickets/ticket-dashboard/ticket-list-agent";
import { useQuery } from "@tanstack/react-query";
import { useAuth, useUser } from "@clerk/nextjs";
import { useStore } from "@/context/store-provider";
import { API_BASE } from "@/lib/api/utils";
import type { Ticket } from "@/lib/types";

export function AgentDashboard() {
  const { user: clerkUser } = useUser();
  const { getToken } = useAuth();
  const { currentUser } = useStore();

  const { data: ticketsData, isLoading } = useQuery({
    queryKey: ["agent-tickets", currentUser?.email],
    queryFn: async () => {
      if (!currentUser) throw new Error("Not logged in");
      const token = await getToken();
      if (!token) throw new Error("No authentication token");
      const response = await fetch(`${API_BASE}/tickets`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch tickets");
      return await response.json();
    },
    enabled: !!currentUser,
  });

  const tickets: Ticket[] = ticketsData?.tickets || [];
  const ticketTotal: number = ticketsData?.total || 0;

  const stats = useMemo(() => {
    const now = new Date();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(now.getDate() - 7); // 7 days ago
    const ongoing = tickets.filter((t: Ticket) =>
      ["ASSIGNED", "IN_PROGRESS", "AWAITING_RESPONSE"].includes(t.status)
    ).length;
    let resolved = 0;
    let newTickets = 0; // tickets assigned within the last week

    tickets.forEach((t: Ticket) => {
      const createdDate = t.createdAt ? new Date(t.createdAt) : null;
      if (createdDate && createdDate >= oneWeekAgo) {
        newTickets += 1;
      }
    });

    return {
      newTickets,
      ongoing,
      resolved,
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
        <h1 className="text-3xl font-bold tracking-tight text-[var(--conductor)]">
          Welcome, {clerkUser?.firstName}
        </h1>
        <p className="text-muted-foreground">Manage your assigned tickets</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="font-medium text-center">
              All Tickets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-center">{ticketTotal}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-medium text-center">
              New Tickets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-center">
              {stats.newTickets}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-medium text-center">
              Ongoing Tickets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-center">
              {stats.ongoing}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-medium text-center">
              Resolved Tickets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-center">
              {stats.resolved}
            </div>
          </CardContent>
        </Card>
      </div>

      <AgentTicketList />
    </div>
  );
}
