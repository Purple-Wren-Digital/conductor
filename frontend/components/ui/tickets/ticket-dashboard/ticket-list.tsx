"use client";

import { useUserRole } from "@/hooks/use-user-role";
import { Card, CardHeader } from "@/components/ui/card";
import AdminTicketList from "@/components/ui/tickets/ticket-dashboard/ticket-list-admin";
import AgentTicketList from "@/components/ui/tickets/ticket-dashboard/ticket-list-agent";
import StaffTicketList from "@/components/ui/tickets/ticket-dashboard/ticket-list-staff";

export default function TicketList() {
  const { role, isLoading } = useUserRole();

  if (isLoading) {
    return (
      <Card className="flex items-center justify-center h-96">
        <CardHeader className="text-center">
          <p className="text-muted-foreground">Loading tickets...</p>
        </CardHeader>
      </Card>
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
        <Card className="flex items-center justify-center h-96">
          <CardHeader className="text-center">
            <p className="text-muted-foreground">
              Unable to determine your role. Please contact support.
            </p>
          </CardHeader>
        </Card>
      );
  }
}
