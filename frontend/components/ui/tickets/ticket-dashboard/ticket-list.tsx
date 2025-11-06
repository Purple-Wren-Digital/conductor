"use client";

import { useAuth } from "@clerk/nextjs";
import { useUserRole } from "@/hooks/use-user-role";
import { Card, CardHeader } from "@/components/ui/card";
import AdminTicketList from "@/components/ui/tickets/ticket-dashboard/ticket-list-admin";
import AgentTicketList from "@/components/ui/tickets/ticket-dashboard/ticket-list-agent";
import StaffTicketList from "@/components/ui/tickets/ticket-dashboard/ticket-list-staff";
import { TicketNotificationCallback } from "@/lib/types";
import { createAndSendNotification } from "@/lib/utils/notifications";
import { useCallback } from "react";

export default function TicketList() {
  const { role, isLoading } = useUserRole();
  const { getToken } = useAuth();

  const handleSendTicketNotifications = useCallback(
    async ({ trigger, receivingUser, data }: TicketNotificationCallback) => {
      try {
        const token = await getToken();
        if (!token) {
          throw new Error("Missing auth token");
        }
        await createAndSendNotification({
          authToken: token,
          trigger: trigger,
          receivingUser: receivingUser,
          data: data,
        });
        // console.log("TicketList - Notifications - Response:", response);
      } catch (error) {
        console.error("TicketList - Unable to generate notifications", error);
      }
    },
    [getToken]
  );

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
      return (
        <AdminTicketList
          handleSendTicketNotifications={handleSendTicketNotifications}
        />
      );
    case "STAFF":
      return (
        <StaffTicketList
          handleSendTicketNotifications={handleSendTicketNotifications}
        />
      );
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
