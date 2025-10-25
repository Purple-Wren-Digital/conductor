"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import TicketHistoryTable from "@/components/history-tables/tickets/history-table-ticket";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRightLeft,
  CalendarIcon,
  CheckCircle,
  CircleMinus,
  CirclePlus,
  Clipboard,
  Clock,
  Edit,
  History,
  Mailbox,
  MessageSquare,
  SquarePen,
  Trash2,
  User,
  X,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import type {
  Ticket,
  PrismaUser,
  TicketStatus,
  Urgency,
  TicketHistory,
} from "@/lib/types";
import { EditTicketForm as TicketForm } from "./ticket-form/edit-ticket-form";
import { TicketCommentsSection } from "./ticket-comments-section";
import { hasDueDateChanged } from "./utils";
import { useUser } from "@clerk/nextjs";
import { useUserRole } from "@/hooks/use-user-role";
import { useStore } from "@/app/store-provider";
import {
  capitalizeEveryWord,
  getCategoryStyle,
  getStatusColor,
  getUrgencyColor,
  parseJsonSafe,
  statusOptions,
  urgencyOptions,
} from "@/lib/utils";
import { API_BASE } from "@/lib/api/utils";
import { useFetchTicketHistory } from "@/hooks/use-history";
import { useQueryClient } from "@tanstack/react-query";

interface TicketDetailViewProps {
  ticketId: string;
  onClose?: () => void;
}

export type PossibleChangesProps = {
  label: string;
  originalValue: string | null;
  newValue: string;
};

type emailNotificationTypes = {
  updatedTicket: Ticket;
  quickUpdate?: {
    field: string;
    current: string;
  };
  reassignmentUpdate?: {
    currentAssignment: PrismaUser | null;
    previousAssignment: PrismaUser | null;
  };
  fullEdits?: {
    oldTicket: Ticket;
  };
};

export const ticketDetailQueryParams = new URLSearchParams(
  "orderBy=desc&limit=5"
);
export const ticketDetailQueryKeyParams = Object.fromEntries(
  ticketDetailQueryParams.entries()
) as Record<string, string>;

export function TicketDetailView({ ticketId, onClose }: TicketDetailViewProps) {
  const { user: clerkUser } = useUser();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [users, setUsers] = useState<PrismaUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditForm, setShowEditForm] = useState(false);

  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const { user: authUser } = useUser();
  const { currentUser } = useStore();
  const { permissions, role } = useUserRole();
  const queryClient = useQueryClient();

  const getAuth0AccessToken = useCallback(async () => {
    if (process.env.NODE_ENV === "development") {
      return "local";
    }
    return clerkUser?.id || "";
  }, []);

  const refreshAllData = useCallback(async () => {
    if (!ticketId) return;
    setLoading(true);
    try {
      const accessToken = clerkUser?.id || "";
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      };

      const [ticketRes, usersRes] = await Promise.all([
        fetch(`${API_BASE}/tickets/${ticketId}`, {
          headers,
          cache: "no-store",
        }),
        fetch(`${API_BASE}/users`, { headers, cache: "no-store" }),
      ]);

      const ticketData = await parseJsonSafe<{ ticket: Ticket }>(ticketRes);
      const usersData = await parseJsonSafe<{ users: PrismaUser[] }>(usersRes);

      setTicket(ticketData.ticket);
      setUsers(usersData?.users ?? []);
    } catch (err) {
      console.error("Error refreshing data:", err);
      setTicket(null);
    } finally {
      setLoading(false);
    }
  }, [ticketId, getAuth0AccessToken]);

  useEffect(() => {
    refreshAllData();
  }, [refreshAllData]);

  const { data: ticketHistoryData, isLoading: isHistoryLoading } =
    useFetchTicketHistory({
      id: ticketId,
      queryKey: ["ticket-history-recent", ticketId, ticketDetailQueryKeyParams],
      queryParams: ticketDetailQueryParams,
    });

  const ticketHistory: TicketHistory[] = ticketHistoryData?.ticketHistory || [];
  const invalidateTicketHistory = queryClient.invalidateQueries({
    queryKey: ["ticket-history-recent", ticketId, ticketDetailQueryKeyParams],
  });

  const findChangedFormValues = ({
    oldTicket,
    updatedTicket,
  }: {
    oldTicket: Ticket;
    updatedTicket: Ticket;
  }) => {
    let changedValues: PossibleChangesProps[] = [];
    const dueDateChanged = hasDueDateChanged(
      oldTicket?.dueDate,
      updatedTicket?.dueDate
    );
    if (dueDateChanged.isChanged !== "unchanged") {
      changedValues = [
        ...changedValues,
        {
          label: "Due Date",
          originalValue: oldTicket?.dueDate
            ? `${new Date(oldTicket.dueDate).toLocaleDateString()}`
            : "N/a",
          newValue: updatedTicket?.dueDate
            ? `${new Date(updatedTicket.dueDate).toLocaleDateString()}`
            : "N/a",
        },
      ];
    }

    if (oldTicket.urgency !== updatedTicket?.urgency) {
      changedValues = [
        ...changedValues,
        {
          label: "Urgency",
          originalValue: oldTicket.urgency,
          newValue: updatedTicket?.urgency,
        },
      ];
    }

    if (oldTicket.category !== updatedTicket?.category) {
      changedValues = [
        ...changedValues,
        {
          label: "Category",
          originalValue: oldTicket?.categoryId ?? null,
          newValue: updatedTicket?.categoryId ?? "",
        },
      ];
    }
    if (oldTicket.description !== updatedTicket.description) {
      changedValues = [
        ...changedValues,
        {
          label: "Description",
          originalValue: oldTicket.description,
          newValue: updatedTicket.description ?? "",
        },
      ];
    }

    if (oldTicket.title !== updatedTicket.title) {
      changedValues = [
        ...changedValues,
        {
          label: "Title",
          originalValue: oldTicket.title,
          newValue: updatedTicket.title ?? "",
        },
      ];
    }
    return changedValues;
  };

  const sendEmailNotification = async (updates: emailNotificationTypes) => {
    if (!updates || !updates?.updatedTicket || !updates?.updatedTicket.id) {
      throw new Error("Ticket was null");
    }
    const updatedTicket = updates?.updatedTicket;

    let url: string = "";
    let body = {};

    if (updates?.quickUpdate) {
      url = "/api/send/quickChange";
      body = {
        ticketNumber: updatedTicket.id,
        ticketTitle: updatedTicket?.title,
        createdOn: updatedTicket?.createdAt,
        updatedOn: updatedTicket?.createdAt,
        editedBy: currentUser || {
          id: "",
          email: authUser?.email || "",
          name: authUser?.name || "",
          role: "AGENT",
        },
        field: updates?.quickUpdate?.field,
        currentData: updates?.quickUpdate?.current,
      };
    }

    if (updates?.reassignmentUpdate) {
      url = "/api/send/reassignTicket";
      body = {
        ticketNumber: updatedTicket.id,
        ticketTitle: updatedTicket?.title,
        createdOn: updatedTicket?.createdAt,
        updatedOn: updatedTicket?.createdAt,
        editedBy: currentUser || {
          id: "",
          email: authUser?.email || "",
          name: authUser?.name || "",
          role: "AGENT",
        },
        currentAssignment: updates?.reassignmentUpdate?.currentAssignment,
        previousAssignment: updates?.reassignmentUpdate?.previousAssignment,
      };
    }

    if (updates?.fullEdits && updates?.fullEdits?.oldTicket) {
      const oldTicket = updates?.fullEdits?.oldTicket;
      const ticketEdits = findChangedFormValues({ oldTicket, updatedTicket });
      if (!ticketEdits) {
        throw new Error("No changes to ticket found");
      }
      url = "/api/send/editTicket";
      body = {
        ticketNumber: updatedTicket.id,
        ticketTitle: updatedTicket?.title,
        createdOn: updatedTicket?.createdAt,
        updatedOn: updatedTicket?.createdAt,
        editedBy: currentUser || {
          id: "",
          email: authUser?.email || "",
          name: authUser?.name || "",
          role: "AGENT",
        },
        changedDetails: ticketEdits,
      };
    }

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        console.error("Failed to send email, status:", response.status);
      } else {
        await response.json();
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
      const accessToken = clerkUser?.id || "";
      const res = await fetch(`${API_BASE}/tickets/update/${ticket.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
        body: JSON.stringify({ [field]: value }),
      });
      if (res.ok && ticket) {
        await sendEmailNotification({
          updatedTicket: ticket || null,
          quickUpdate: { field: field, current: value },
        });
      }
      await parseJsonSafe(res);
      await invalidateTicketHistory;
      await refreshAllData();
    } catch (error) {
      console.error("Failed to update ticket:", error);
      setTicket(prev);
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
      const accessToken = clerkUser?.id || "";
      const res = await fetch(`${API_BASE}/tickets/${ticket.id}/assign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
        body: JSON.stringify({
          assigneeId: newAssigneeId === "unassigned" ? null : newAssigneeId,
        }),
      });
      await parseJsonSafe(res);
      await refreshAllData();
      await invalidateTicketHistory;

      await sendEmailNotification({
        updatedTicket: ticket,
        reassignmentUpdate: {
          currentAssignment: nextAssignee || null,
          previousAssignment: prev?.assignee || null,
        },
      });
    } catch (error) {
      console.error("Failed to assign ticket", error);
      setTicket(prev);
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

  const getActionIcon = (action: string) => {
    switch (action.toUpperCase()) {
      case "CREATE":
        return <Clipboard className="h-3 w-3" />;
      case "UPDATE":
        return <SquarePen className="h-3 w-3" />;
      case "DELETE":
        return <Trash2 className="h-3 w-3" />;
      case "INVITE":
        return <Mailbox className="h-3 w-3" />;
      case "ADD":
        return <CirclePlus className="h-3 w-3" />;
      case "REMOVE":
        return <CircleMinus className="h-3 w-3" />;
      case "ROLE CHANGE":
        return <ArrowRightLeft className="h-4 w-4" />;
      default:
        return <Clipboard className="h-3 w-3" />;
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
      <div className="flex items-center flex-col justify-center gap-4  sm:flex-row sm:justify-between ">
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
        <div className="flex items-center gap-4">
          <div className="ml-auto">
            <Button
              variant="outline"
              onClick={() => setShowHistoryModal(!showHistoryModal)}
              className="gap-2"
            >
              <History className="h-4 w-4" /> View History
            </Button>
          </div>
          {(permissions?.canReassignTicket ||
            (role === "AGENT" && ticket.assigneeId === currentUser?.id)) && (
            <div className="ml-auto">
              <Button
                variant="outline"
                onClick={() => setShowEditForm(true)}
                className="gap-2"
              >
                <Edit className="h-4 w-4" /> Edit Ticket
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3 lg:grid-rows-[auto_1fr] justify-center">
        {/* TICKET HISTORY */}
        {showHistoryModal && (
          <div className="lg:col-span-3 space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Ticket History</CardTitle>
                <Button
                  variant={"ghost"}
                  onClick={() => setShowHistoryModal(false)}
                >
                  <X className="h-5 w-5 text-muted-foreground" />
                </Button>
              </CardHeader>
              <CardContent>
                <TicketHistoryTable ticketId={ticket.id} />
              </CardContent>
            </Card>
          </div>
        )}
        {/* TICKET DETAILS */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <CardTitle className="text-xl">{ticket.title}</CardTitle>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={getStatusColor(ticket.status)}>
                      {ticket.status.replace("_", " ")}
                    </Badge>
                    <Badge variant={getUrgencyColor(ticket.urgency)}>
                      {ticket.urgency}
                    </Badge>
                    <Badge
                      variant="category"
                      style={getCategoryStyle(
                        ticket?.category?.name ?? "Missing Category"
                      )}
                      title={ticket?.category?.name ?? "Missing Category"}
                      className="text-xs px-2 py-0.5"
                    >
                      {ticket?.category?.name ?? "Missing Category"}
                    </Badge>
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
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
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
        <div className="lg:col-span-1 space-y-6">
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
                    disabled={
                      role === "AGENT" && ticket.assigneeId !== currentUser?.id
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

                {permissions?.canReassignTicket && (
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
                )}

                {permissions?.canReassignTicket && (
                  <div className="space-y-2">
                    <Label>Assignee</Label>
                    <Select
                      value={ticket.assignee?.id || "Unassigned"}
                      onValueChange={handleAssigneeChange}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Unassigned">Unassigned</SelectItem>
                        {users &&
                          users.length > 0 &&
                          users.map((u) => {
                            const staffPermissions =
                              role === "ADMIN" ||
                              (role === "STAFF" &&
                                currentUser?.marketCenterId &&
                                u?.marketCenterId ===
                                  currentUser?.marketCenterId) ||
                              (role === "STAFF" &&
                                !currentUser?.marketCenterId &&
                                u?.id !== currentUser?.id);

                            return (
                              <SelectItem
                                key={u.id}
                                value={u.id}
                                disabled={!staffPermissions}
                              >
                                {u.name} ({u.role})
                              </SelectItem>
                            );
                          })}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Recent Activity
                </CardTitle>
                <CardDescription>
                  Last Updated:{" "}
                  {ticket?.updatedAt
                    ? new Date(ticket?.updatedAt).toLocaleDateString()
                    : ""}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isHistoryLoading &&
                  (!ticketHistory || !ticketHistory?.length) && (
                    <div className="border-b pb-4">
                      <p className="text-sm font-medium text-muted-foreground">
                        Loading...
                      </p>
                    </div>
                  )}
                {!isHistoryLoading &&
                  (!ticketHistory || !ticketHistory?.length) && (
                    <div className="border-b pb-4">
                      <p className="text-sm font-medium text-muted-foreground">
                        No recent updates
                      </p>
                    </div>
                  )}
                {!isHistoryLoading &&
                  ticketHistory &&
                  ticketHistory.length > 0 &&
                  ticketHistory.map((log: TicketHistory) => {
                    return (
                      <div key={log?.id} className="border-b pb-4">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                          <Label>
                            {log?.action && capitalizeEveryWord(log?.action)}{" "}
                            {log?.field && capitalizeEveryWord(log?.field)}
                          </Label>
                          <p className="text-sm font-medium">
                            {new Date(log?.changedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex flex-col justify-between gap-2 mb-1">
                          <div className="flex gap-1 flex-wrap items-center text-muted-foreground">
                            {log?.field === "comment" ? (
                              <MessageSquare className="h-3 w-3" />
                            ) : (
                              getActionIcon(log?.action)
                            )}
                            <p
                              className={`text-sm font-medium ${log?.field === "comment" && "truncate max-w-[100px] xs:max-w-[350px] lg:max-w-[175px]"}`}
                            >
                              {log?.newValue}
                            </p>
                          </div>
                          <div className="flex gap-1 flex-wrap items-center text-muted-foreground">
                            <p className="text-sm font-medium">
                              By:{" "}
                              {log?.changedBy?.name
                                ? log?.changedBy?.name
                                : `#${log?.changedById}`}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                <div className="mt-4">
                  <Button
                    asChild
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowHistoryModal(true)}
                  >
                    <p>View All Changes</p>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <TicketForm
        ticket={ticket ?? undefined}
        isOpen={showEditForm}
        onClose={() => setShowEditForm(false)}
        onSuccess={async (updated: Ticket | null) => {
          if (updated) {
            await sendEmailNotification({
              updatedTicket: updated,
              fullEdits: { oldTicket: ticket },
            });
            setTicket((prev) => (prev ? { ...prev, ...updated } : updated));
          }
          setShowEditForm(false);
          void (await refreshAllData());
        }}
      />
    </div>
  );
}
