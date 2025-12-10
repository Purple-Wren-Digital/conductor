"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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
import { StarRating } from "@/components/ui/ratingInput/star-rating-static";
import TicketSurveyModal from "@/components/ui/tickets/survey/ticket-survey-modal";
import TicketHistoryTable from "@/components/history-tables/tickets/history-table-ticket";
import { EditTicketForm } from "@/components/ui/tickets/ticket-form/edit-ticket-form";
import {
  ArrowLeft,
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
  Survey,
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
import { useFetchTicketSurveyResults } from "@/hooks/use-tickets";
import type { ActivityUpdates } from "@/packages/transactional/emails/types";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
    } catch {
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
      queryKey: [
        "ticket-history-recent",
        ticketId,
        { orderBy: "desc", limit: "5" },
      ],
      queryParams: new URLSearchParams("orderBy=desc&limit=5"),
    });
  const ticketHistory: TicketHistory[] = ticketHistoryData?.ticketHistory || [];
  const invalidateTicketHistory = useCallback(
    () =>
      queryClient.invalidateQueries({
        queryKey: [
          "ticket-history-recent",
          ticketId,
          { orderBy: "desc", limit: "5" },
        ],
      }),
    [queryClient, ticketId]
  );

  const { data: surveyData, isLoading: isSurveyLoading } =
    useFetchTicketSurveyResults(ticket?.status, ticket?.surveyId ?? undefined);
  const survey: Survey = useMemo(() => {
    return surveyData ? surveyData : ({} as Survey);
  }, [surveyData]);
  const invalidateSurvey = useCallback(
    () =>
      queryClient.invalidateQueries({
        queryKey: ["ticket-survey", ticket?.surveyId ?? undefined],
      }),
    [queryClient, ticket?.surveyId]
  );

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

    const notifyCreator = userToNotify.updateType === "unchanged";
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
            notifyCreator && changedDetails
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
    } catch {
      // Notification failed silently
    }
  };

  const handleSendTicketClosedNotifications = async ({
    userToNotify,
    ticket,
  }: {
    userToNotify: UsersToNotify;
    ticket: Ticket;
  }) => {
    const notifyCreator = userToNotify.updateType === "unchanged";
    const notifySurvey =
      userToNotify?.updateType === "ticketSurvey" ||
      userToNotify?.updateType === "ticketSurveyResults";
    try {
      const response = await createAndSendNotification({
        getToken: getToken,
        templateName: notifySurvey ? "Ticket Survey" : "Ticket Updated",
        trigger: notifySurvey ? "Ticket Survey" : "Ticket Updated",
        receivingUser: {
          id: userToNotify?.id,
          name: userToNotify?.name,
          email: userToNotify?.email,
        },
        data: {
          ticketSurvey:
            notifySurvey && !notifyCreator
              ? {
                  ticketNumber: ticketId,
                  ticketTitle: ticket?.title ?? "No title provided",
                  surveyorName: userToNotify?.name ?? "No name provided",
                }
              : undefined,
          updatedTicket:
            !notifySurvey && notifyCreator
              ? {
                  ticketNumber: ticketId,
                  ticketTitle: ticket?.title ?? "No title provided",
                  createdOn: ticket?.createdAt,
                  updatedOn: ticket?.updatedAt,
                  editorName: userToNotify?.name ?? "Unknown",
                  editorId: userToNotify?.id ?? "",
                  changedDetails: [
                    {
                      label: "Status",
                      newValue: "RESOLVED",
                      originalValue: "ASSIGNED",
                    },
                  ],
                }
              : undefined,
        },
      });
    } catch {
      // Notification failed silently
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
      if (!data || !data?.usersToNotify || !data?.usersToNotify.length) {
        throw new Error("No data returned from close ticket");
      }
      await Promise.all(
        data?.usersToNotify.map(
          async (user: UsersToNotify) =>
            await handleSendTicketClosedNotifications({
              userToNotify: user,
              ticket: ticket,
            })
        )
      );

      toast.success("Ticket closed successfully.");
    } catch {
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
    } catch {
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
    } catch {
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

  const getRoleIcon = (userRole: UserRole) => {
    const Icon = ROLE_ICONS[userRole as keyof typeof ROLE_ICONS];
    return Icon ? (
      <Icon className="h-4 w-4 text-muted-foreground" />
    ) : (
      <User className="h-4 w-4 text-muted-foreground" />
    );
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
        <Button variant="ghost" onClick={() => router.back()} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => setShowHistoryModal(!showHistoryModal)}
            className="gap-2 w-full sm:w-fit"
            disabled={isHistoryLoading || isLoading}
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
          {canTakeSurvey && (
            <Button
              variant={!surveyData?.completed ? "destructive" : "secondary"}
              onClick={() => setShowSurveyModal(true)}
              disabled={isLoading || isSurveyLoading}
              className="gap-2"
            >
              <ClipboardListIcon className="h-4 w-4" />
              {!surveyData?.completed ? "Take Survey" : "Retake Survey"}
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
              <div className="w-full space-y-2">
                {/* TITLE, BADGES */}
                <CardTitle className="text-xl">
                  {isLoading
                    ? "Loading ticket..."
                    : ticket?.title
                      ? ticket.title
                      : "Ticket"}
                </CardTitle>
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
                <TicketTodos
                  ticketId={ticket.id}
                  disabled={!canEditTicket || isLoading || canTakeSurvey}
                />
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
                          return;
                        }
                        await handleUpdateTicket("status", value);
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
                          <SelectItem
                            value="Unassigned"
                            disabled={!permissions?.canUnassignTicket}
                          >
                            Unassigned
                          </SelectItem>
                          {users &&
                            users.length > 0 &&
                            users.map((user) => {
                              const assignmentPermissions =
                                permissions?.canReassignTicket &&
                                (role === "ADMIN" ||
                                  (role === "STAFF_LEADER" &&
                                    currentUser?.marketCenterId &&
                                    user?.marketCenterId ===
                                      currentUser?.marketCenterId) ||
                                  (role === "STAFF" &&
                                    user?.id === currentUser?.id));

                              return (
                                <SelectItem
                                  key={user.id}
                                  value={user.id}
                                  disabled={
                                    !assignmentPermissions ||
                                    isLoading ||
                                    isHistoryLoading
                                  }
                                >
                                  {user.name}:{" "}
                                  {user?.role
                                    ? capitalizeEveryWord(
                                        user.role.split("_").join(" ")
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
        survey={survey}
        showSurveyModal={showSurveyModal}
        setShowSurveyModal={setShowSurveyModal}
        refreshSurvey={invalidateSurvey}
        disabled={isLoading || isSurveyLoading || !canTakeSurvey}
      />
    </div>
  );
}
