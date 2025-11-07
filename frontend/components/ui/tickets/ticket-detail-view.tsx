"use client";

import { useState, useEffect, useCallback } from "react";
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
import { format } from "date-fns";
import type {
  Ticket,
  PrismaUser,
  TicketStatus,
  Urgency,
  TicketHistory,
  UsersToNotify,
} from "@/lib/types";

import { EditTicketForm } from "@/components/ui/tickets/ticket-form/edit-ticket-form";
import { TicketCommentsSection } from "@/components/ui/tickets/ticket-comments-section";
import { AttachmentsList } from "./attachments-list";
import { FileUpload } from "./file-upload";
import { useAuth, useUser } from "@clerk/nextjs";
import { useUserRole } from "@/hooks/use-user-role";
import { useStore } from "@/context/store-provider";
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
import { createAndSendNotification } from "@/lib/utils/notifications";
import { useFetchTicketHistory } from "@/hooks/use-history";
import type { ActivityUpdates } from "@/packages/transactional/emails/types";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Link from "next/link";
interface TicketDetailViewProps {
  ticketId: string;
  onClose?: () => void;
}

export const ticketDetailQueryParams = new URLSearchParams(
  "orderBy=desc&limit=5"
);
export const ticketDetailQueryKeyParams = Object.fromEntries(
  ticketDetailQueryParams.entries()
) as Record<string, string>;

export function TicketDetailView({ ticketId, onClose }: TicketDetailViewProps) {
  const { getToken } = useAuth();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [attachmentTotal, setAttachmentTotal] = useState(0);
  const [commentTotal, setCommentTotal] = useState(0);
  const [users, setUsers] = useState<PrismaUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditForm, setShowEditForm] = useState(false);

  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const { currentUser } = useStore();
  const { permissions, role } = useUserRole();
  const queryClient = useQueryClient();

  const refreshAllData = useCallback(async () => {
    if (!ticketId) return;
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Failed to get authentication token");
      }
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };

      const [ticketRes, usersRes] = await Promise.all([
        fetch(`${API_BASE}/tickets/${ticketId}`, {
          headers,
          cache: "no-store",
        }),
        fetch(`${API_BASE}/users`, { headers, cache: "no-store" }),
      ]);

      const usersData = await parseJsonSafe<{ users: PrismaUser[] }>(usersRes);
      const ticketData = await ticketRes.json();
      setAttachmentTotal(ticketData?.attachmentCount || 0);
      setCommentTotal(ticketData?.commentCount || 0);

      setTicket(ticketData.ticket);
      setUsers(usersData?.users ?? []);
    } catch (err) {
      console.error("Error refreshing data:", err);
      setTicket(null);
    } finally {
      setLoading(false);
    }
  }, [ticketId, getToken]);

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

  const handleSendTicketNotifications = async ({
    ticket,
    userToNotify,
    changedDetails,
  }: {
    ticket: Ticket;
    userToNotify: UsersToNotify;
    changedDetails: ActivityUpdates[] | null;
  }) => {
    console.log("SENDING NOTIFICATIONS....");
    const title = ticket?.title ?? "";
    const notifySomeone = userToNotify.updateType === "unchanged";
    const notifyAssigneeChanges =
      userToNotify.updateType === "added" ||
      userToNotify.updateType === "removed";

    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Failed to get authentication token");
      }
      const response = await createAndSendNotification({
        authToken: token,
        trigger: notifyAssigneeChanges ? "Ticket Assignment" : "Ticket Updated",
        receivingUser: {
          id: userToNotify?.id,
          name: userToNotify?.name,
          email: userToNotify?.email,
        },
        data: {
          updatedTicket:
            notifySomeone && changedDetails
              ? {
                  ticketNumber: ticket.id,
                  ticketTitle: ticket?.title ?? "No title provided",
                  createdOn: ticket?.createdAt,
                  updatedOn: ticket?.updatedAt,
                  editedByName: currentUser?.name ?? "Unknown",
                  editedById: currentUser?.id ?? "",
                  changedDetails: changedDetails,
                }
              : undefined,
          ticketAssignment: notifyAssigneeChanges
            ? {
                ticketNumber: ticket.id,
                ticketTitle: title,
                createdOn: ticket?.createdAt,
                updatedOn: ticket?.createdAt,
                editedByName: currentUser?.name ?? "Unknown",
                editedById: currentUser?.id ?? "",
                updateType: userToNotify.updateType,
                currentAssignment: {
                  id: userToNotify?.id,
                  name: userToNotify?.name,
                },
                previousAssignment: null,
              }
            : undefined,
        },
      });
    } catch (error) {
      console.error(
        "TicketDetailView - Unable to generate notifications",
        error
      );
    }
  };

  const handleUpdateTicket = async (field: keyof Ticket, value: any) => {
    if (!ticket) return;

    const prev = ticket;
    setTicket({ ...ticket, [field]: value });

    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Failed to get authentication token");
      }
      const res = await fetch(`${API_BASE}/tickets/update/${ticket.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
        body: JSON.stringify({ [field]: value }),
      });
      const data = await res.json();
      if (
        data &&
        data?.ticket &&
        data?.usersToNotify &&
        data?.usersToNotify?.length > 0
      ) {
        console.log("Notifying users....", data?.usersToNotify);

        await Promise.all(
          data.usersToNotify.map(async (user: UsersToNotify) => {
            await handleSendTicketNotifications({
              ticket: data.ticket as Ticket,
              userToNotify: user,
              changedDetails: data?.changedDetails ?? [],
            });
          })
        );
      }
    } catch (error) {
      console.error("Failed to update ticket:", error);
      setTicket(prev);
    } finally {
      await refreshAllData();
      await invalidateTicketHistory;
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
      const token = await getToken();
      if (!token) {
        throw new Error("Failed to get authentication token");
      }
      const res = await fetch(`${API_BASE}/tickets/${ticket.id}/assign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
        body: JSON.stringify({
          assigneeId: newAssigneeId,
        }),
      });
      const data = await res.json();

      if (
        data &&
        data?.ticket &&
        data?.usersToNotify &&
        data?.usersToNotify?.length > 0
      ) {
        await Promise.all(
          data.usersToNotify.map(async (user: UsersToNotify) => {
            await handleSendTicketNotifications({
              ticket: data.ticket as Ticket,
              userToNotify: user,
              changedDetails: null,
            });
          })
        );
      }
    } catch (error) {
      console.error("Failed to assign ticket", error);
      toast.error("Error: Failed to update ticket");
      setTicket(prev);
    } finally {
      await refreshAllData();
      await invalidateTicketHistory;
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
          <h1 className="text-2xl font-bold">#{ticket.id.substring(0, 8)}</h1>
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
          <div
            className="lg:col-span-3 space-y-6"
            id={`ticket-history-modal-${ticket.id}`}
          >
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
                  <div className="flex items-center gap-2 flex-wrap mb-2">
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
                <div className="space-y-2">
                  <h4 className="font-medium">Description</h4>

                  <p className="text-muted-foreground leading-relaxed">
                    {ticket.description}
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground hover:underline">
                      <Link href={`#comments-section-${ticketId}`}>
                        Comments: {commentTotal}
                      </Link>
                    </p>
                    <p className="text-sm text-muted-foreground"> • </p>
                    <p className="text-sm text-muted-foreground hover:underline">
                      <Link href={`#attachments-section-${ticketId}`}>
                        Attachments: {attachmentTotal}
                      </Link>
                    </p>
                  </div>
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

          {/* Attachments Section */}
          <Card id={`attachments-section-${ticket.id}`}>
            <CardHeader>
              <CardTitle>Attachments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <AttachmentsList
                ticketId={ticket.id}
                attachments={ticket.attachments}
                canDelete={
                  role === "ADMIN" ||
                  role === "STAFF" ||
                  (role === "AGENT" && ticket.assigneeId === currentUser?.id)
                }
                onAttachmentDeleted={() => refreshAllData()}
              />
              <FileUpload
                ticketId={ticket.id}
                onUploadComplete={() => refreshAllData()}
              />
            </CardContent>
          </Card>
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
                              className={`text-sm font-medium ${
                                log?.field === "comment" &&
                                "truncate max-w-[100px] xs:max-w-[350px] lg:max-w-[175px]"
                              }`}
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

      <EditTicketForm
        ticket={ticket ?? undefined}
        isOpen={showEditForm}
        onClose={() => setShowEditForm(false)}
        onSuccess={async (updated: Ticket | null) => {
          if (updated) {
            setTicket((prev) => (prev ? { ...prev, ...updated } : updated));
          }
          setShowEditForm(false);
          void (await refreshAllData());
        }}
      />
    </div>
  );
}
