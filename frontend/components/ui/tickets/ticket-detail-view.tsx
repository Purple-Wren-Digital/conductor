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
import { StarRating } from "@/components/ui/ratingInput/star-rating-static";
import TicketSurveyModal from "@/components/ui/tickets/survey/ticket-survey-modal";
import TicketHistoryTable from "@/components/history-tables/tickets/history-table-ticket";
import {
  ArrowRightLeft,
  CalendarIcon,
  CircleMinus,
  CirclePlus,
  Clipboard,
  ClipboardListIcon,
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
import { AttachmentsList } from "@/components/ui/tickets/attachments-list";
import { FileUpload } from "@/components/ui/tickets/file-upload";
import { useUserRole } from "@/hooks/use-user-role";
import { useStore } from "@/context/store-provider";
import {
  capitalizeEveryWord,
  getCategoryStyle,
  parseJsonSafe,
  statusOptions,
  urgencyOptions,
} from "@/lib/utils";
import { API_BASE } from "@/lib/api/utils";
import { createAndSendNotification } from "@/lib/utils/notifications";
import { useFetchTicketHistory } from "@/hooks/use-history";
import { useFetchTicketSurveyResults } from "@/hooks/use-tickets";
import type { ActivityUpdates } from "@/packages/transactional/emails/types";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Link from "next/link";

export const ticketDetailQueryParams = new URLSearchParams(
  "orderBy=desc&limit=5"
);
export const ticketDetailQueryKeyParams = Object.fromEntries(
  ticketDetailQueryParams.entries()
) as Record<string, string>;

export function TicketDetailView({ ticketId }: { ticketId: string }) {
  const { getToken } = useAuth();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [attachmentTotal, setAttachmentTotal] = useState(0);
  const [commentTotal, setCommentTotal] = useState(0);
  const [users, setUsers] = useState<PrismaUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showSurveyModal, setShowSurveyModal] = useState(false);

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
    ticket?.status !== "RESOLVED" &&
    (role === "ADMIN" ||
      agentCanEditTicket ||
      staffCanEditMCTicket ||
      staffCanEditOwnTickets);

  const refreshAllData = useCallback(async () => {
    if (!ticketId) return;
    setIsLoading(true);
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
      setIsLoading(false);
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

  const { data: surveyData, isLoading: isSurveyLoading } =
    useFetchTicketSurveyResults(ticket?.status, ticket?.surveyId ?? undefined);

  const invalidateSurvey = queryClient.invalidateQueries({
    queryKey: ["ticket-survey", ticket?.surveyId ?? undefined],
  });

  const canTakeSurvey =
    ticket?.status === "RESOLVED" && surveyData?.surveyorId === currentUser?.id;

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
      const response = await createAndSendNotification({
        getToken: getToken,
        templateName:
          notifyAssigneeChanges && userToNotify.updateType === "added"
            ? "Ticket Assignment - Added"
            : notifyAssigneeChanges && userToNotify.updateType === "removed"
              ? "Ticket Assignment - Removed"
              : "Ticket Updated",
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
                  editorName: currentUser?.name ?? "Unknown",
                  editorId: currentUser?.id ?? "",
                  changedDetails: changedDetails,
                }
              : undefined,
          ticketAssignment: notifyAssigneeChanges
            ? {
                ticketNumber: ticket.id,
                ticketTitle: title,
                createdOn: ticket?.createdAt,
                updatedOn: ticket?.createdAt,
                editorName: currentUser?.name ?? "Unknown",
                editorId: currentUser?.id ?? "",
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

  const handleCloseTicket = async () => {
    setIsLoading(true);
    if (!ticket || !ticketId) {
      throw new Error("Ticket ID is required to close a ticket");
    }
    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Failed to get authentication token");
      }
      const res = await fetch(`${API_BASE}/tickets/close/${ticketId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
        body: JSON.stringify({ status: "RESOLVED" as TicketStatus }),
      });
      if (!res.ok) throw new Error("Failed to close ticket");
      const data = await res.json();
      if (
        !data ||
        !data?.usersToNotify ||
        !data?.usersToNotify.length ||
        !data?.changedDetails
      ) {
        throw new Error("No data returned from close ticket");
      }
      const { usersToNotify, changedDetails } = data;
      await Promise.all(
        usersToNotify.map(
          async (user: UsersToNotify) =>
            await handleSendTicketNotifications({
              ticket: {
                id: ticketId,
                title: ticket?.title ?? "No title provided",
                createdAt: ticket.createdAt,
                updatedAt: new Date(ticket.updatedAt || new Date()),
                resolvedAt: new Date(ticket.resolvedAt || new Date()),
                description: null,
                status: "RESOLVED",
                urgency: ticket.urgency as Urgency,
                dueDate: ticket.dueDate ?? null,
                ticketHistory: [],
                attachments: [],
                creator: ticket.creator,
              },
              userToNotify: user,
              changedDetails: changedDetails,
            })
        )
      );

      toast.success("Ticket closed successfully.");
    } catch (error) {
      console.error("Failed to close ticket:", error);
      toast.error("Error: Failed to close ticket. Please try again.");
    } finally {
      await refreshAllData();
      setIsLoading(false);
    }
  };

  const handleUpdateTicket = async (field: keyof Ticket, value: any) => {
    if (!ticket) throw new Error("No ticket loaded");
    if (ticket && ticket.status === "RESOLVED") {
      toast.info("Resolved tickets cannot be edited");
      return;
    }
    setIsLoading(true);

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
      setIsLoading(false);
    }
  };

  const handleAssigneeChange = async (newAssigneeId: string) => {
    if (!ticket) return;
    if (ticket && ticket.status === "RESOLVED") {
      toast.info("Resolved tickets cannot be edited");
      return;
    }
    setIsLoading(true);
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
      setIsLoading(false);
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

  if (!ticket) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">
          Ticket not found or could not be loaded.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center flex-col justify-center gap-4  sm:flex-row sm:justify-between ">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">
            {isLoading ? "Loading ticket..." : `#${ticket.id.substring(0, 8)}`}
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="ml-auto">
            <Button
              variant="outline"
              onClick={() => setShowHistoryModal(!showHistoryModal)}
              className="gap-2"
              disabled={isHistoryLoading || isLoading}
            >
              <History className="h-4 w-4" /> View History
            </Button>
          </div>
          {canEditTicket && (
            <div className="ml-auto">
              <Button
                onClick={() => setShowEditForm(true)}
                className="gap-2"
                disabled={isHistoryLoading || isLoading}
              >
                <Edit className="h-4 w-4" /> Edit Ticket
              </Button>
            </div>
          )}
          {canTakeSurvey && (
            <div className="ml-auto">
              <Button
                variant={"destructive"}
                onClick={() => setShowSurveyModal(true)}
                disabled={
                  isLoading || isSurveyLoading || surveyData?.completed === true
                }
                className="gap-2"
              >
                <ClipboardListIcon className="h-4 w-4" />
                Take Survey
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
                  disabled={!currentUser || isLoading || isHistoryLoading}
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
                disabled={!canEditTicket || isLoading}
                ticketId={ticket.id}
                onUploadComplete={() => refreshAllData()}
              />
            </CardContent>
          </Card>
        </div>
        {/* ACTION or SURVEY */}
        <div className="lg:col-span-1 space-y-6">
          {ticket?.status === "RESOLVED" ? (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <ClipboardListIcon className="size-4 text-muted-foreground" />
                    <CardTitle>Survey Results</CardTitle>
                  </div>

                  <CardDescription>
                    {ticket?.surveyId &&
                      surveyData &&
                      surveyData.completed === true &&
                      `Completed by ${surveyData?.surveyor?.name ?? "N/a"} on ${
                        surveyData?.updatedAt
                          ? format(new Date(surveyData.updatedAt), "PPP p")
                          : ""
                      }`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {ticket?.surveyId && surveyData && (
                    <div className="space-y-2">
                      <div className="space-y-1">
                        <p className="font-medium">Overall:</p>
                        {surveyData?.overallRating ? (
                          <StarRating
                            rating={surveyData.overallRating}
                            size={18}
                          />
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            Not Rated
                          </p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium">Assignee:</p>
                        <div>
                          {surveyData.assigneeRating ? (
                            <StarRating
                              rating={surveyData.assigneeRating}
                              size={18}
                            />
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              Not Rated
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium">Market Center:</p>
                        <div>
                          {surveyData?.marketCenterRating ? (
                            <StarRating
                              rating={surveyData.marketCenterRating}
                              size={18}
                            />
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              Not Rated
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium">Comments:</p>
                        {surveyData?.comment ? (
                          <p className="text-sm text-muted-foreground">
                            {surveyData.comment}
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            No comments
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
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
                      onValueChange={async (value: TicketStatus) => {
                        if (value === "RESOLVED") {
                          await handleCloseTicket();
                        } else {
                          await handleUpdateTicket("status", value);
                        }
                      }}
                      disabled={!canEditTicket || isLoading}
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
                      disabled={!canEditTicket || isLoading}
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
                          !permissions?.canReassignTicket ||
                          isLoading ||
                          isHistoryLoading
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
                                  disabled={
                                    !staffPermissions ||
                                    isLoading ||
                                    isHistoryLoading
                                  }
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
          )}

          {/* RECENT ACTIVITY */}
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
        disabled={!canEditTicket || isLoading}
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

      <TicketSurveyModal
        ticketId={ticket.id}
        surveyId={ticket.surveyId ?? ""}
        showSurveyModal={showSurveyModal}
        setShowSurveyModal={setShowSurveyModal}
        refreshSurvey={invalidateSurvey}
        disabled={isLoading || isSurveyLoading || !canTakeSurvey}
      />
    </div>
  );
}
