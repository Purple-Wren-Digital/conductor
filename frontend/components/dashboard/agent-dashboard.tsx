"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@clerk/nextjs";
import { useStore } from "@/app/store-provider";
import { API_BASE } from "@/lib/api/utils";
import { Ticket, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TicketTabs } from "@/components/ui/tabs/ticket-tabs";

export function AgentDashboard() {
  const { user: clerkUser } = useUser();
  const { currentUser } = useStore();

  const { data: ticketsData, isLoading } = useQuery({
    queryKey: ["agent-tickets", currentUser?.id],
    queryFn: async () => {
      if (!clerkUser?.id) throw new Error("Not authenticated");
      const response = await fetch(
        `${API_BASE}/tickets/search?assigneeId=${currentUser?.id}`,
        {
          headers: {
            Authorization: `Bearer ${clerkUser.id}`,
          },
        }
      );
      if (!response.ok) throw new Error("Failed to fetch tickets");
      return response.json();
    },
    enabled: !!currentUser?.id && !!clerkUser?.id,
  });

  const tickets = ticketsData?.tickets || [];

  const stats = {
    assigned: tickets.filter((t: any) => t.status === "ASSIGNED").length,
    inProgress: tickets.filter((t: any) => t.status === "IN_PROGRESS").length,
    awaitingResponse: tickets.filter(
      (t: any) => t.status === "AWAITING_RESPONSE"
    ).length,
    resolved: tickets.filter((t: any) => t.status === "RESOLVED").length,
  };

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
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {currentUser?.name}
        </h1>
        <p className="text-muted-foreground">Here are your assigned tickets</p>
      </div>

      <TicketTabs />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.assigned}</div>
            <p className="text-xs text-muted-foreground">
              Tickets awaiting action
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inProgress}</div>
            <p className="text-xs text-muted-foreground">
              Currently working on
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Awaiting Response
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.awaitingResponse}</div>
            <p className="text-xs text-muted-foreground">
              Waiting for customer
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.resolved}</div>
            <p className="text-xs text-muted-foreground">
              Completed this month
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Active Tickets</CardTitle>
          <CardDescription>
            View and manage your assigned tickets
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {tickets
              .filter((t: any) => t.status !== "RESOLVED")
              .slice(0, 5)
              .map((ticket: any) => (
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
                    <p className="text-sm text-muted-foreground">
                      #{ticket.id.substring(0, 8)} •{" "}
                      {ticket.status.replace("_", " ")}
                    </p>
                  </div>
                </div>
              ))}
            {tickets.filter((t: any) => t.status !== "RESOLVED").length ===
              0 && (
              <p className="text-muted-foreground text-center py-4">
                No active tickets
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
    </div>
  );
}
