"use client";

import { DashboardOverview } from "@/components/ui/dashboard/dashboard-overview";
import { TicketTabs } from "@/components/ui/tabs/ticket-tabs";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ticket Dashboard</h1>
          <p className="text-muted-foreground">Manage and track support tickets efficiently</p>
        </div>
      </div>

      <TicketTabs />

      <DashboardOverview />
    </div>
  );
}
