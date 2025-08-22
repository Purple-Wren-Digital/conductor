"use client";

import { TicketTabs } from "@/components/ui/tabs/ticket-tabs";
import { TicketList } from "@/components/ui/tickets/ticket-list";

export default function DashboardTicketsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Ticket Dashboard</h1>
        <p className="text-muted-foreground">Manage and track support tickets efficiently</p>
      </div>

      <TicketTabs />

      <TicketList />
    </div>
  );
}
