"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Calendar,
  User,
  Clock,
  Edit,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react"; // , useMemo
import { format } from "date-fns";
import type {
  Ticket,
  User as UserType,
  TicketStatus,
  Urgency,
} from "@/lib/types";
import { EditTicketForm as TicketForm } from "./ticket-form/edit-ticket-form";
import { TicketCommentsSection } from "./ticket-comments-section";
import { toast } from "sonner";
// import { getAccessToken, useUser } from "@auth0/nextjs-auth0";

interface TicketDetailViewProps {
  ticketId: string;
  onClose?: () => void;
}

const statusOptions: TicketStatus[] = [
  "ASSIGNED",
  "AWAITING_RESPONSE",
  "IN_PROGRESS",
  "RESOLVED",
];
const urgencyOptions: Urgency[] = ["HIGH", "MEDIUM", "LOW"];

const API_BASE = "http://localhost:4000";

async function parseJsonSafe<T>(res: Response): Promise<T> {
  const ct = res.headers.get("content-type") || "";
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `HTTP ${res.status} ${res.statusText} - ${text || "No body"}`
    );
  }
  if (ct.includes("application/json")) {
    return res.json();
  }
  const text = await res.text().catch(() => "");
  throw new Error(
    `Expected JSON but got ${
      ct || "unknown content-type"
    }. First 200 chars:\n${text.slice(0, 200)}`
  );
}

export function TicketDetailView({ ticketId, onClose }: TicketDetailViewProps) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditForm, setShowEditForm] = useState(false);
  
  // TODO: REMOVE HARDCODED USER
  const hardcodedUser = {
    id: "u1",
    email: "alice.agent@kw.com",
    name: "Alice Johnson",
    role: "AGENT",
  };
  // const { user: authUser } = useUser();

  // const getAuthToken = useCallback(async () => {
  //   if (process.env.NODE_ENV === "development") {
  //     return "local";
  //   }
  //   return await getAccessToken();
  // }, []);

  const refreshAllData = useCallback(async () => {
    if (!ticketId) return;
    setLoading(true);
    try {
      // const accessToken = await getAuthToken();
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        // Authorization: `Bearer ${accessToken}`,
      };

      const [ticketRes, usersRes] = await Promise.all([
        fetch(`${API_BASE}/tickets/${ticketId}`, {
          headers,
          cache: "no-store",
        }),
        fetch(`${API_BASE}/users`, { headers, cache: "no-store" }),
      ]);

      const ticketData = await parseJsonSafe<{ ticket: Ticket }>(ticketRes);
      const usersData = await parseJsonSafe<{ users: UserType[] }>(usersRes);

      setTicket(ticketData.ticket);
      setUsers(usersData.users || []);
    } catch (err) {
      console.error("Error refreshing data:", err);
      setTicket(null);
    } finally {
      setLoading(false);
    }
  }, [ticketId]); //, getAuthToken]);

  useEffect(() => {
    refreshAllData();
  }, [refreshAllData]);

  const sendQuickUpdateEmailNotification = async ({
    ticket,
    field,
    current,
  }: {
    ticket: Ticket | null;
    field: string;
    current: string;
  }) => {
    if (!ticket || !ticket.id) {
      throw new Error("Ticket was null");
    }

    const ticketQuickUpdateEmailBody = {
      emailData: {
        ticketNumber: ticket.id,
        ticketTitle: ticket?.title,
        createdOn: ticket?.createdAt,
        updatedOn: ticket?.createdAt,
        editedBy: hardcodedUser,
        field: field,
        currentData: current,
      },
    };

    try {
      const response = await fetch("/api/send/quickChange", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify(ticketQuickUpdateEmailBody),
      });
      if (!response.ok) {
        console.error("Failed to send email, status:", response.status);
      } else {
        const data = await response.json();
        console.log("Email sent successfully:", data);
      }
    } catch (err) {
      console.error("Failed to send email", err);
    }
  };

  const handleUpdateTicket = async (field: keyof Ticket, value: any) => {
    if (!ticket) return;

    const prev = ticket;
    setTicket({ ...ticket, [field]: value });

    try {
      // const accessToken = await getAuthToken();
      const res = await fetch(`${API_BASE}/tickets/${ticket.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          // Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
        body: JSON.stringify({ [field]: value }),
      });
      await parseJsonSafe(res);
      await refreshAllData();
      if (res.ok) {
        await sendQuickUpdateEmailNotification({
          ticket: ticket || null,
          field: field,
          current: value,
        });
      }
    } catch (error) {
      console.error("Failed to update ticket:", error);
      setTicket(prev);
    }
  };

  const sendReassignmentEmailNotification = async (
    ticket: Ticket | null,
    currentAssignment: UserType | null,
    previousAssignment: UserType | null
  ) => {
    if (!ticket || !ticket.id) {
      throw new Error("Ticket was null");
    }

    const ticketReassignmentEmailBody = {
      emailData: {
        ticketNumber: ticket.id,
        ticketTitle: ticket?.title,
        createdOn: ticket?.createdAt,
        updatedOn: ticket?.createdAt,
        editedBy: hardcodedUser,
        currentAssignment: currentAssignment,
        previousAssignment: previousAssignment,
      },
    };

    try {
      const response = await fetch("/api/send/reassignTicket", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify(ticketReassignmentEmailBody),
      });
      if (!response.ok) {
        console.error("Failed to send email, status:", response.status);
      } else {
        const data = await response.json();
        console.log("Email sent successfully:", data);
        toast.success("Ticket reassigned! Confirmation email sent.");
      }
    } catch (err) {
      console.error("Failed to send email", err);
    }
  };

  const handleAssigneeChange = async (newAssigneeId: string) => {
    if (!ticket) return;

    const prev = ticket;
    const nextAssignee =
      newAssigneeId === "unassigned"
        ? undefined
        : users.find((u) => u.id === newAssigneeId);
    setTicket({
      ...ticket,
      assignee: nextAssignee
        ? ({
            id: nextAssignee.id,
            name: nextAssignee.name,
            role: nextAssignee.role,
          } as any)
        : undefined,
    });

    try {
      // const accessToken = await getAuthToken();
      const res = await fetch(`${API_BASE}/tickets/${ticket.id}/assign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
        body: JSON.stringify({
          assigneeId: newAssigneeId === "unassigned" ? null : newAssigneeId,
        }),
      });
      await parseJsonSafe(res);
      await refreshAllData();

      await sendReassignmentEmailNotification(
        ticket,
        nextAssignee || null,
        prev?.assignee || null
      );
    } catch (error) {
      console.error("Failed to assign ticket", error);
      setTicket(prev);
    }
  };

  const getStatusColor = (status: TicketStatus) => {
    switch (status) {
      case "RESOLVED":
        return "default";
      case "IN_PROGRESS":
        return "default";
      case "ASSIGNED":
        return "secondary";
      case "AWAITING_RESPONSE":
        return "outline";
      default:
        return "secondary";
    }
  };

  const getUrgencyColor = (urgency: Urgency) => {
    switch (urgency) {
      case "HIGH":
        return "destructive";
      case "MEDIUM":
        return "default";
      case "LOW":
        return "secondary";
      default:
        return "secondary";
    }
  };

  const getStatusIcon = (status: TicketStatus) => {
    switch (status) {
      case "RESOLVED":
        return <CheckCircle className="h-4 w-4" />;
      case "IN_PROGRESS":
        return <Clock className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Loading ticket…</p>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">
          Ticket not found or could not be loaded.
        </p>
        {onClose && (
          <Button
            variant="outline"
            onClick={onClose}
            className="mt-4 bg-transparent"
          >
            Go Back
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Tickets
          </Button>
        )}
        <div className="flex items-center gap-2">
          {getStatusIcon(ticket.status)}
          <h1 className="text-2xl font-bold">
            #{ticket.id.substring(0, 8)}...
          </h1>
        </div>
        <div className="ml-auto">
          <Button
            variant="outline"
            onClick={() => setShowEditForm(true)}
            className="gap-2"
          >
            <Edit className="h-4 w-4" /> Edit Ticket
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <CardTitle className="text-xl">{ticket.title}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusColor(ticket.status)}>
                      {ticket.status.replace("_", " ")}
                    </Badge>
                    <Badge variant={getUrgencyColor(ticket.urgency)}>
                      {ticket.urgency}
                    </Badge>
                    <Badge variant="outline">{ticket.category}</Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Description</h4>
                  <p className="text-muted-foreground leading-relaxed">
                    {ticket.description}
                  </p>
                </div>
                <Separator />
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Created by:</span>
                    <span className="font-medium">{ticket.creator?.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Created:</span>
                    <span className="font-medium">
                      {format(new Date(ticket.createdAt), "PPP")}
                    </span>
                  </div>
                  {ticket.assignee && (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        Assigned to:
                      </span>
                      <span className="font-medium">
                        {ticket.assignee.name}
                      </span>
                    </div>
                  )}
                  {ticket.dueDate && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Due date:</span>
                      <span className="font-medium">
                        {format(new Date(ticket.dueDate), "PPP")}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <TicketCommentsSection ticketId={ticket.id} />
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={ticket.status}
                  onValueChange={(value: TicketStatus) =>
                    handleUpdateTicket("status", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status.replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Urgency</Label>
                <Select
                  value={ticket.urgency}
                  onValueChange={(value: Urgency) =>
                    handleUpdateTicket("urgency", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {urgencyOptions.map((urgency) => (
                      <SelectItem key={urgency} value={urgency}>
                        {urgency}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Assignee</Label>
                <Select
                  value={ticket.assignee?.id || "unassigned"}
                  onValueChange={handleAssigneeChange}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} ({user.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <TicketForm
        ticket={ticket ?? undefined}
        isOpen={showEditForm}
        onClose={() => setShowEditForm(false)}
        onSuccess={(updated) => {
          if (updated) setTicket(updated);
          setShowEditForm(false);
          void refreshAllData();
        }}
      />
    </div>
  );
}
