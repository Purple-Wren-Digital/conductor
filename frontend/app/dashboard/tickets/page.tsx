"use client";

import { useUserRole } from "@/hooks/use-user-role";
import AdminTicketList from "@/components/ui/tickets/ticket-dashboard/ticket-list-admin";
import AgentTicketList from "@/components/ui/tickets/ticket-dashboard/ticket-list-agent";
import StaffTicketList from "@/components/ui/tickets/ticket-dashboard/ticket-list-staff";

export default function TicketList() {
  const { role, isLoading } = useUserRole();

  if (isLoading) {
    return (
      <section className="flex items-center justify-center h-96 space-y-4">
        <h1 className="text-muted-foreground font-medium text-center w-full">
          Loading tickets...
        </h1>
      </section>
    );
  }

  switch (role) {
    case "ADMIN":
      return <AdminTicketList />;
    case "STAFF":
      return <StaffTicketList />;
    case "STAFF_LEADER":
      return <StaffTicketList />;
    case "AGENT":
      return <AgentTicketList />;
    default:
      return (
        <section className="flex items-center justify-center h-96 space-y-4">
          <h1 className="text-muted-foreground font-medium text-center w-full">
            Unable to determine your role. Please contact support.
          </h1>
        </section>
      );
  }
}
