"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
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
import { AttachmentsList } from "@/components/ui/tickets/attachments-list";
import { FileUpload } from "@/components/ui/tickets/file-upload";
import { TicketTodos } from "@/components/ui/tickets/ticket-subtask";
import { TicketCommentsSection } from "@/components/ui/tickets/ticket-comments-section";
import TicketHistoryTable from "@/components/history-tables/tickets/history-table-ticket";
import { EditTicketForm } from "@/components/ui/tickets/ticket-form/edit-ticket-form";
import {
  ArrowLeft,
  ArrowRightLeft,
  CalendarIcon,
  CircleMinus,
  CirclePlus,
  Clipboard,
  Clock,
  Edit,
  History,
  Mailbox,
  MessageSquare,
  Paperclip,
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
  UserRole,
} from "@/lib/types";

import { useUserRole } from "@/hooks/use-user-role";
import { useStore } from "@/context/store-provider";
import {
  capitalizeEveryWord,
  getCategoryStyle,
  parseJsonSafe,
  ROLE_ICONS,
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
import { useRouter } from "next/navigation";
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

  const router = useRouter();
  const { currentUser } = useStore();
  const { permissions, role } = useUserRole();
  const queryClient = useQueryClient();

  const agentCanEditTicket =
    role === "AGENT" &&
    ticket?.creator &&
    ticket?.creator?.email === currentUser?.email;

  const staffCanEditMCTicket =
    ((role === "STAFF" || role === "STAFF_LEADER") &&
      currentUser?.marketCenterId) ||
    (ticket?.assignee &&
      ticket?.assignee?.marketCenterId === currentUser?.marketCenterId) ||
    (ticket?.creator &&
      ticket?.creator?.marketCenterId === currentUser?.marketCenterId);
  const staffCanEditOwnTickets =
    (role === "STAFF" || role === "STAFF_LEADER") &&
    !currentUser?.marketCenterId &&
    ((ticket?.creator && ticket?.creator?.email === currentUser?.email) ||
      (ticket?.assignee && ticket?.assignee?.email === currentUser?.email));

  const canEditTicket =
    role === "ADMIN" ||
    agentCanEditTicket ||
    staffCanEditMCTicket ||
    staffCanEditOwnTickets;

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
    if (!ticket) throw new Error("No ticket loaded");
    if (ticket && ticket.status === "RESOLVED") {
      toast.info("Resolved tickets cannot be edited");
      return;
    }

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
    if (ticket && ticket.status === "RESOLVED") {
      toast.info("Resolved tickets cannot be edited");
      return;
    }
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
        body: JSON.stringify({ assigneeId: newAssigneeId }),
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

  const getRoleIcon = (userRole: UserRole) => {
    const Icon = ROLE_ICONS[userRole as keyof typeof ROLE_ICONS];
    return Icon ? (
      <Icon className="h-4 w-4 text-muted-foreground" />
    ) : (
      <User className="h-4 w-4 text-muted-foreground" />
    );
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
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div className="flex items-center gap-4 space-y-2 flex-wrap">
          <Button
            variant="outline"
            onClick={() => setShowHistoryModal(!showHistoryModal)}
            className="gap-2 w-full sm:w-fit"
          >
            <History className="h-4 w-4" /> View History
          </Button>
          {canEditTicket && (
            <Button
              onClick={() => setShowEditForm(true)}
              className="gap-2 w-full sm:w-fit"
              disabled={ticket.status === "RESOLVED"}
            >
              <Edit className="h-4 w-4" /> Edit Ticket
            </Button>
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
                  disabled={!canEditTicket}
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
              <div className="w-full space-y-2">
                {/* TITLE, BADGES */}
                <CardTitle className="text-xl">{ticket.title}</CardTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  <CardDescription className="text-sm text-muted-foreground font-md">
                    Ticket{" "}
                    {ticket?.id
                      ? `#${ticket.id.substring(0, 8)}`
                      : "Unknown"}{" "}
                  </CardDescription>
                  <Badge
                    variant={ticket.status.toLowerCase() as any}
                    className="capitalize"
                  >
                    {ticket.status.split("_").join(" ").toLowerCase()}
                  </Badge>
                  <Badge variant={ticket.urgency.toLowerCase() as any}>
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
            </CardHeader>
            <CardContent className="space-y-4">
              {/* CREATED, ASSIGNED, DUE, COMMENTS, ATTACHMENTS */}
              <div className="py-2 grid gap-4 md:grid-cols-3">
                {ticket.assignee && (
                  <div className="flex items-center gap-2 text-sm">
                    {getRoleIcon(ticket.assignee?.role ?? "AGENT")}
                    <span className="text-muted-foreground">Assigned to:</span>
                    <span className="font-medium">{ticket.assignee.name}</span>
                  </div>
                )}
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
                {ticket.dueDate && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Due date:</span>
                    <span className="font-medium">
                      {format(new Date(ticket.dueDate), "PPP")}
                    </span>
                  </div>
                )}
                <Link
                  href={`#attachments-section-${ticketId}`}
                  className="flex items-center gap-2 text-sm  hover:underline"
                >
                  <Paperclip className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Attachments:</span>
                  <span className="font-medium">{attachmentTotal}</span>
                </Link>
                <Link
                  href={`#attachments-section-${ticketId}`}
                  className="flex items-center gap-2 text-sm  hover:underline"
                >
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Comments:</span>
                  <span className="font-medium">{commentTotal}</span>
                </Link>
              </div>
              <Separator />
              {/* DESCRIPTION, TASKS */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <h4 className="text-lg font-semibold">Ticket Details</h4>
                </div>
                <div className="space-y-2">
                  <p className="font-medium leading-relaxed text-muted-foreground">
                    {ticket.description}
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <TicketTodos ticketId={ticket.id} />
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
                disabled={!canEditTicket}
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
                    disabled={!canEditTicket}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((status: TicketStatus) => (
                        <SelectItem key={status} value={status}>
                          <Badge variant={status.toLowerCase() as any}>
                            {status.replace("_", " ")}
                          </Badge>
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
                    disabled={!canEditTicket}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {urgencyOptions.map((urgency) => (
                        <SelectItem key={urgency} value={urgency}>
                          <Badge variant={urgency.toLowerCase() as any}>
                            {urgency}
                          </Badge>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {permissions?.canReassignTicket && (
                  <div className="space-y-2">
                    <Label>Assignee</Label>
                    <Select
                      value={ticket.assignee?.id || "Unassigned"}
                      onValueChange={handleAssigneeChange}
                      disabled={
                        ticket.status === "RESOLVED" ||
                        !permissions?.canReassignTicket
                      }
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
                              role === "STAFF_LEADER" ||
                              (role === "STAFF" &&
                                !currentUser?.marketCenterId &&
                                u?.id !== currentUser?.id);

                            return (
                              <SelectItem
                                key={u.id}
                                value={u.id}
                                disabled={!staffPermissions}
                              >
                                {u.name}:{" "}
                                {u?.role
                                  ? capitalizeEveryWord(
                                      u.role.split("_").join(" ")
                                    )
                                  : "Unassigned"}
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
                              {log?.newValue
                                ? log.newValue.split("_").join(" ")
                                : ""}
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
        disabled={ticket.status === "RESOLVED" || !canEditTicket}
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
