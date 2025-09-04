"use client";

import React, { useCallback, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
// import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TicketListItem } from "@/components/ui/list-item/ticket-list-item";
import { Hash, Mail, Shield } from "lucide-react";
import { UserRole, Ticket } from "@/lib/types";
import { useQueryClient } from "@tanstack/react-query";
import { getAccessToken } from "@auth0/nextjs-auth0";

interface UserPrisma {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  picture?: string;
}

type TicketWithUpdatedAt = Ticket & { updatedAt?: string | Date };

const UserProfileLayout = () => {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { userId } = useParams<{ userId: string }>();

  const [user, setUser] = React.useState<UserPrisma | null>(null);
  const [ticketsCreated, setTicketsCreated] = React.useState<Ticket[] | null>(
    null
  );

  const getAuthToken = useCallback(async () => {
    if (process.env.NODE_ENV === "development") return "local";
    return await getAccessToken();
  }, []);

  const fetchUserFromPrisma = async () => {
    try {
      const accessToken = await getAuthToken();
      const res = await fetch(`/api/users/${userId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!res.ok) {
        throw new Error("Failed to fetch user");
      }
      const data = await res.json();
      if (data && data?.user) setUser(data.user);
    } catch (error) {
      console.error("Error fetching user:", error);
    }
  };

  useEffect(() => {
    fetchUserFromPrisma();
  }, []);

  const getTicketsForUser = async () => {
    try {
      const accessToken = await getAuthToken();
      const res = await fetch(`/api/tickets?creatorId=${userId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        throw new Error("Failed to fetch tickets");
      }
      const data = await res.json();
      setTicketsCreated(data.tickets || []);
    } catch (error) {
      console.error("Error fetching user's tickets:", error);
    }
  };

  useEffect(() => {
    if (!user || !user?.id) return;
    getTicketsForUser();
  }, [user]);

  const mappedTicketsCreated = ticketsCreated?.map((ticket: Ticket) => ({
    ...ticket,
    updatedAt:
      ticket.updatedAt instanceof Date
        ? ticket.updatedAt.toISOString()
        : ticket.updatedAt,
  }));

  const handleTicketClick = (ticket: Ticket) => {
    queryClient.setQueryData(["ticket", ticket.id], { ticket });
    router.push(`/dashboard/tickets/${ticket.id}`);
  };

  return (
    <div className="space-y-6 ">
      <Card className="p-4 ">
        <CardHeader>
          <div className="flex gap-2 flex-row justify-between items-center">
            <div className="flex flex-col gap-1">
              <CardTitle className="text-xl text-foreground pt-4 ">
                {user?.name || "User not found"}
              </CardTitle>

              <div className="flex gap-2 flex-row items-center">
                <p className="text-m text-muted-foreground semi-bold">
                  {user?.isActive ? "Active" : "Inactive"} User
                </p>
              </div>
            </div>
            {/* <Button onClick={() => console.log("pressed")} className="gap-2">
              <SquarePen className="h-4 w-4" />
              Edit Profile
            </Button> */}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 flex-col pb-4">
            <p className="text-l font-bold">Information</p>
            <div className="flex gap-2 flex-row items-center">
              <Hash className="h-4 w-4" />
              <p className="text-sm"> {userId || ""}</p>
            </div>
            <div className="flex gap-2 flex-row items-center">
              <Shield className="h-4 w-4" />
              <p className="text-sm">{user?.role || ""}</p>
            </div>
            <div className="flex gap-2 flex-row items-center">
              <Mail className="h-4 w-4" />
              <p className="text-sm">{user?.email || ""}</p>
            </div>
          </div>
          <div className="flex gap-2 flex-row mt-4 mb-4">
            <p className="text-xs text-muted-foreground">
              {user && user.createdAt
                ? `Created: ${new Date(
                    user.createdAt
                  ).toLocaleDateString()} ${new Date(
                    user.createdAt
                  ).toLocaleTimeString()}`
                : ""}
            </p>
            <p className="text-xs text-muted-foreground">|</p>
            <p className="text-xs text-muted-foreground">
              {user && user.updatedAt
                ? `Updated ${new Date(
                    user.updatedAt
                  ).toLocaleDateString()} at ${new Date(
                    user.updatedAt
                  ).toLocaleTimeString()}`
                : ""}
            </p>
          </div>
          <div className="flex gap-2 flex-col border-t pt-4 pb-4">
            <p className="text-l font-bold">Created Tickets</p>
            {!ticketsCreated && !mappedTicketsCreated && (
              <p className="text-sm text-muted-foreground">
                No created tickets found.
              </p>
            )}
            {mappedTicketsCreated &&
              mappedTicketsCreated.map((ticket: TicketWithUpdatedAt) => (
                <TicketListItem
                  key={ticket.id}
                  ticket={ticket}
                  onSelect={(checked: boolean) => {
                    console.log("selected ticket", ticket.id, checked);
                  }}
                  onClick={() => handleTicketClick(ticket)}
                  onEdit={(e) => {
                    console.log("edit ticket", ticket.id);
                    e.stopPropagation();
                  }}
                  onClose={(e) => {
                    console.log("close ticket", ticket.id);
                    e.stopPropagation();
                  }}
                  selected={false}
                />
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserProfileLayout;
