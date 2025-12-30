"use client";

import type React from "react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useStore } from "@/context/store-provider";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import PagesAndItemsCount from "@/components/ui/pagination/page-and-items-count";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreateTicketForm } from "@/components/ui/tickets/ticket-form/create-ticket-form";
import { EditTicketForm } from "@/components/ui/tickets/ticket-form/edit-ticket-form";
import { TicketListItemWrapper } from "@/components/ui/tickets/ticket-list-item-wrapper";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { format, startOfDay, endOfDay } from "date-fns";
import { useFetchMarketCenterCategories } from "@/hooks/use-market-center";
import { useFetchAgentTickets } from "@/hooks/use-tickets";
import { useUserRole } from "@/hooks/use-user-role";
import {
  calculateTotalPages,
  defaultActiveStatuses,
  formatOrderBy,
  formatTicketOptions,
  orderByOptions,
  sortByTicketOptions,
  statusOptions,
  urgencyOptions,
} from "@/lib/utils";
import { createAndSendNotification } from "@/lib/utils/notifications";
import {
  ArrowDown,
  ArrowDownUp,
  ArrowUp,
  CalendarIcon,
  Eye,
  EyeClosed,
  Filter,
  Plus,
  Search,
  Users,
  X,
} from "lucide-react";
import { API_BASE } from "@/lib/api/utils";
import type {
  Ticket,
  TicketStatus,
  Urgency,
  OrderBy,
  TicketSortBy,
  TicketsResponse,
  TicketWithUpdatedAt,
  TicketCategory,
  UsersToNotify,
} from "@/lib/types";
import { ActivityUpdates } from "@/packages/transactional/emails/types";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ToolTip } from "@/components/ui/tooltip/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export default function AgentTicketList() {
  const [isLoading, setIsLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const [viewDashboardHeader, setViewDashboardHeader] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
  const [selectedStatuses, setSelectedStatuses] = useState<TicketStatus[]>(
    defaultActiveStatuses
  );
  const [selectedUrgencies, setSelectedUrgencies] = useState<Urgency[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const [selectedAssignee, setSelectedAssignee] = useState<string>("all");

  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();

  const [openFrom, setOpenFrom] = useState(false);
  const [openTo, setOpenTo] = useState(false);

  const [sortBy, setSortBy] = useState<TicketSortBy>("updatedAt");
  const [sortDir, setSortDir] = useState<OrderBy>("desc");

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);

  const router = useRouter();
  const queryClient = useQueryClient();
  const { currentUser } = useStore();
  const { permissions } = useUserRole();

  const { getToken } = useAuth();

  useEffect(() => {
    if (!hydrated) return; // prevents overwrite on load
    localStorage.setItem(
      "ticket-filters",
      JSON.stringify({
        viewDashboardHeader,

        searchQuery,
        selectedStatuses,
        selectedUrgencies,
        selectedCategory,
        selectedAssignee,
        dateFrom: dateFrom ? dateFrom.toISOString() : null,
        dateTo: dateTo ? dateTo.toISOString() : null,
        openFrom,
        openTo,
        sortBy,
        sortDir,
        currentPage,
        showFilters,
      })
    );
  }, [
    viewDashboardHeader,
    hydrated,
    searchQuery,
    selectedStatuses,
    selectedUrgencies,
    selectedCategory,
    selectedAssignee,
    dateFrom,
    dateTo,
    openFrom,
    openTo,
    sortBy,
    sortDir,
    currentPage,
    showFilters,
  ]);

  useEffect(() => {
    const filtersString = localStorage.getItem("ticket-filters");
    if (filtersString) {
      const fetchedFilters = JSON.parse(filtersString);
      setViewDashboardHeader(fetchedFilters.viewDashboardHeader || true);
      setSearchQuery(fetchedFilters.searchQuery || "");
      setSelectedStatuses(
        fetchedFilters.selectedStatuses || defaultActiveStatuses
      );
      setSelectedUrgencies(fetchedFilters.selectedUrgencies || []);
      setSelectedCategory(fetchedFilters.selectedCategory || "all");
      setSelectedAssignee(fetchedFilters.selectedAssignee || "all");
      setDateFrom(
        fetchedFilters.dateFrom ? new Date(fetchedFilters.dateFrom) : undefined
      );
      setDateTo(
        fetchedFilters.dateTo ? new Date(fetchedFilters.dateTo) : undefined
      );
      setOpenFrom(fetchedFilters.openFrom || false);
      setOpenTo(fetchedFilters.openTo || false);
      setSortBy(fetchedFilters.sortBy || "updatedAt");
      setSortDir(fetchedFilters.sortDir || "desc");
      setCurrentPage(fetchedFilters.currentPage || 1);

      setShowFilters(fetchedFilters.showFilters || false);
    }

    setHydrated(true);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();

    if (debouncedSearchQuery) params.append("query", debouncedSearchQuery);
    selectedStatuses.forEach((s) => params.append("status", s));
    selectedUrgencies.forEach((u) => params.append("urgency", u));

    if (selectedAssignee !== "all")
      params.append("assigneeId", selectedAssignee);

    if (selectedCategory !== "all")
      params.append("categoryId", selectedCategory);

    if (dateFrom) params.append("dateFrom", startOfDay(dateFrom).toISOString());
    if (dateTo) params.append("dateTo", endOfDay(dateTo).toISOString());

    params.append("sortBy", sortBy);
    params.append("sortDir", sortDir);
    params.append("limit", String(itemsPerPage));
    params.append("offset", String((currentPage - 1) * itemsPerPage));
    return params;
  }, [
    debouncedSearchQuery,
    selectedStatuses,
    selectedUrgencies,
    selectedCategory,
    selectedAssignee,
    dateFrom,
    dateTo,
    sortBy,
    sortDir,
    currentPage,
    itemsPerPage,
  ]);

  const queryKeyParams = useMemo(
    () => Object.fromEntries(queryParams.entries()) as Record<string, string>,
    [queryParams]
  );

  const agentTicketsQueryKey = useMemo(
    () => ["agent-tickets", queryKeyParams] as const,
    [queryKeyParams]
  );

  const agentTicketsQueryInvalidator = () =>
    queryClient.invalidateQueries({ queryKey: agentTicketsQueryKey });

  const { data: ticketsData, isFetching: ticketsLoading } =
    useFetchAgentTickets({ queryParams, agentTicketsQueryKey, hydrated });
  const tickets: TicketWithUpdatedAt[] = useMemo(() => {
    return ticketsData?.tickets ?? [];
  }, [ticketsData]);

  const totalTickets = tickets?.length ?? 0;
  const totalPages = calculateTotalPages({
    totalItems: totalTickets,
    itemsPerPage,
  });

  const teamMembersAssignedToTickets = useMemo(() => {
    const members = tickets.map((ticket) => {
      if (ticket?.assigneeId && ticket.assignee?.name) {
        return {
          id: ticket.assigneeId,
          name: ticket.assignee.name,
          role: ticket?.assignee?.role ?? null,
        };
      }
      return { id: "Unassigned", name: "Unassigned", role: null };
    });

    // Dedupe by id
    const unique = new Map(members.map((m) => [m.id, m]));
    return [...unique.values()];
  }, [tickets]);

  const { data: ticketCategoryData } = useFetchMarketCenterCategories(
    currentUser?.marketCenterId ?? ""
  );
  const categories: TicketCategory[] = ticketCategoryData?.categories ?? [];

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedStatuses(defaultActiveStatuses);
    setSelectedUrgencies([]);
    setSelectedCategory("all");
    setSelectedAssignee("all");
    setDateFrom(undefined);
    setDateTo(undefined);
    setOpenFrom(false);
    setOpenTo(false);
    setCurrentPage(1);
    setSortBy("updatedAt");
    setSortDir("desc");
  };

  const hasActiveFilters =
    !!searchQuery ||
    selectedStatuses.length !== defaultActiveStatuses.length ||
    selectedUrgencies.length > 0 ||
    selectedCategory !== "all" ||
    selectedAssignee !== "all" ||
    !!dateFrom ||
    !!dateTo ||
    sortDir !== "desc" ||
    sortBy !== "updatedAt";

  const handleTicketClick = (ticket: Ticket) => {
    queryClient.setQueryData(["ticket", ticket.id], { ticket });
    router.push(`/dashboard/tickets/${ticket.id}`);
  };

  const handleQuickEdit = (e: React.MouseEvent, ticket: Ticket) => {
    e.stopPropagation();
    setEditingTicket(ticket);
    setIsEditOpen(true);
  };

  const handleSendTicketClosedNotifications = useCallback(
    async ({
      userToNotify,
      ticket,
    }: {
      userToNotify: UsersToNotify;
      ticket: { id: string; title: string; createdAt: Date };
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
                    ticketNumber: ticket.id,
                    ticketTitle: ticket?.title ?? "No title provided",
                    surveyorName: userToNotify?.name ?? "No name provided",
                  }
                : undefined,
            updatedTicket:
              !notifySurvey && notifyCreator
                ? {
                    ticketNumber: ticket.id,
                    ticketTitle: ticket?.title ?? "No title provided",
                    createdOn: ticket?.createdAt,
                    updatedOn: new Date(),
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
      } catch (error) {
        console.error(
          "TicketListAgent - Unable to generate Survey notifications",
          error
        );
      }
    },
    [getToken]
  );

  const closeTicketMutation = useMutation({
    mutationFn: async (ticket: Ticket) => {
      setIsLoading(true);
      if (!ticket || !ticket?.id) {
        throw new Error("Ticket ID is required to close a ticket");
      }
      const token = await getToken();
      if (!token) {
        throw new Error("Failed to get authentication token");
      }
      const res = await fetch(`${API_BASE}/tickets/close/${ticket.id}`, {
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
      if (!data || !data?.usersToNotify || !data?.usersToNotify.length)
        throw new Error("No data returned from close ticket");
      return { ...data, ticket: ticket };
    },
    onSuccess: async (data: {
      usersToNotify: UsersToNotify[];
      changedDetails: ActivityUpdates;
      ticket: Ticket;
    }) => {
      const { usersToNotify, changedDetails, ticket } = data;
      await Promise.all(
        usersToNotify.map((user) =>
          handleSendTicketClosedNotifications({
            ticket: {
              id: ticket.id,
              title: ticket?.title ?? "No title provided",
              createdAt: ticket.createdAt,
            },
            userToNotify: user,
          })
        )
      );

      toast.success("Ticket closed successfully.");
    },
    onError: (error) => {
      console.error("Failed to close ticket:", error);
      toast.error("Error: Failed to close ticket. Please try again.");
    },
    onSettled: async () => {
      await agentTicketsQueryInvalidator();
      setIsLoading(false);
    },
  });

  const handleQuickClose = useCallback(
    (e: React.MouseEvent, ticket: Ticket) => {
      e.stopPropagation();
      closeTicketMutation.mutate(ticket);
    },
    [closeTicketMutation]
  );

  const handleSendTicketNotifications = useCallback(
    async ({
      ticket,
      userToNotify,
      changedDetails,
    }: {
      ticket: Ticket;
      userToNotify: UsersToNotify;
      changedDetails: ActivityUpdates[] | null;
    }) => {
      const title = ticket?.title ?? "";

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
          trigger: notifyAssigneeChanges
            ? "Ticket Assignment"
            : "Ticket Updated",
          receivingUser: {
            id: userToNotify?.id,
            name: userToNotify?.name,
            email: userToNotify?.email,
          },
          data: {
            updatedTicket:
              !notifyAssigneeChanges && changedDetails
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
    },
    [getToken, currentUser]
  );

  const handleReopenTicket = useCallback(
    async (ticket: Ticket) => {
      if (!ticket?.id) {
        throw new Error("Ticket ID is required to reopen a ticket");
      }
      setIsLoading(true);
      try {
        const token = await getToken();
        if (!token) {
          throw new Error("Failed to get authentication token");
        }
        const response = await fetch(
          `${API_BASE}/tickets/reopen/${ticket.id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
          }
        );
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to reopen ticket");
        }
        const data = await response.json();
        if (data && data?.usersToNotify && data?.usersToNotify.length > 0) {
          await Promise.all(
            data.usersToNotify.map(async (user: UsersToNotify) =>
              handleSendTicketNotifications({
                ticket: ticket as Ticket,
                userToNotify: user,
                changedDetails: [
                  {
                    label: "Ticket Reopened",
                    originalValue: "RESOLVED",
                    newValue: "IN_PROGRESS",
                  },
                ],
              })
            )
          );
        }
      } catch (error) {
        toast.error("Error: Failed to reopen ticket");
        console.error("Reopen ticket error:", error);
      } finally {
        await agentTicketsQueryInvalidator();
        setIsLoading(false);
      }
    },
    [getToken, handleSendTicketNotifications]
  );

  const stats = useMemo(() => {
    const resolvedTicketsCount = tickets.filter(
      (t: Ticket) => t.status === "RESOLVED"
    ).length;
    return {
      resolvedTicketsCount,
    };
  }, [tickets]);

  return (
    <>
      <Collapsible
        open={viewDashboardHeader}
        onOpenChange={setViewDashboardHeader}
      >
        <CollapsibleContent>
          <section className="space-y-4 mb-4">
            <div className="flex flex-wrap gap-4 items-center justify-between space-y-0.5">
              <h1 className="text-xl font-bold text-left w-full sm:w-fit">
                Tickets ({totalTickets})
              </h1>
              <div className="flex items-center gap-4 w-full sm:w-fit">
                {permissions?.canCreateTicket && (
                  <Button
                    className="gap-2 w-full sm:w-fit"
                    onClick={() => setIsCreateOpen(true)}
                    disabled={isLoading}
                  >
                    <Plus className="h-4 w-4" />
                    Create Ticket
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-4 mt-4">
              <div className="flex flex-col w-full items-center gap-4 sm:flex-row sm:w-none">
                <div className="relative flex-1 w-full sm:w-fit">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search tickets..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    disabled={isLoading}
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 bg-transparent w-full sm:w-fit"
                  onClick={() => setShowFilters(!showFilters)}
                  type="button"
                  disabled={isLoading}
                >
                  <Filter className="h-4 w-4" />
                  Filters
                  {hasActiveFilters && (
                    <Badge
                      variant="secondary"
                      className="ml-1 h-2 w-2 rounded-full p-0"
                    />
                  )}
                </Button>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="gap-2 w-full sm:w-fit"
                    type="button"
                    disabled={isLoading}
                  >
                    <X className="h-4 w-4" />
                    Clear
                  </Button>
                )}
              </div>
              {showFilters && (
                <Card className="p-4 bg-muted/50">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Assignee</Label>
                      <Select
                        value={selectedAssignee}
                        onValueChange={(v) => {
                          setSelectedAssignee(v);
                          setCurrentPage(1);
                        }}
                        disabled={isLoading}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select assignee" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem
                            value="all"
                            className="flex items-center gap-2"
                          >
                            <Users className="h-4 w-4" />
                            All Team Members
                          </SelectItem>
                          {teamMembersAssignedToTickets &&
                            teamMembersAssignedToTickets.length > 0 &&
                            teamMembersAssignedToTickets.map((user) => (
                              <SelectItem key={user.id} value={user.id}>
                                <span className="font-medium">
                                  {user.name}:
                                </span>
                                <span className="hidden md:block text-muted-foreground capitalize">
                                  {user?.role
                                    ? user.role
                                        .split("_")
                                        .join(" ")
                                        .toLowerCase()
                                    : "No role"}
                                </span>
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {/* Date From */}
                    <div className="space-y-2">
                      <Label>Date From</Label>
                      <Popover open={openFrom} onOpenChange={setOpenFrom}>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full justify-start text-left font-normal bg-transparent"
                            onClick={() => setOpenFrom(true)}
                            disabled={isLoading}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateFrom ? format(dateFrom, "PPP") : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={dateFrom}
                            onSelect={(d) => {
                              setDateFrom(d);
                              setCurrentPage(1);
                              setOpenFrom(false);
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Date To */}
                    <div className="space-y-2">
                      <Label>Date To</Label>
                      <Popover open={openTo} onOpenChange={setOpenTo}>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full justify-start text-left font-normal bg-transparent"
                            onClick={() => setOpenTo(true)}
                            disabled={isLoading}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateTo ? format(dateTo, "PPP") : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={dateTo}
                            onSelect={(d) => {
                              setDateTo(d);
                              setCurrentPage(1);
                              setOpenTo(false);
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    {/* STATUS */}
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <div className="flex flex-wrap gap-2">
                        {statusOptions.map((status) => (
                          <div
                            key={status}
                            className="flex items-center space-x-2"
                          >
                            <Checkbox
                              id={`status-${status}`}
                              checked={selectedStatuses.includes(status)}
                              onCheckedChange={(
                                v: boolean | "indeterminate"
                              ) => {
                                const checked = v === true;
                                setSelectedStatuses((prev) =>
                                  checked
                                    ? [...prev, status]
                                    : prev.filter((s) => s !== status)
                                );
                                setCurrentPage(1);
                              }}
                            />
                            <Label
                              htmlFor={`status-${status}`}
                              className="text-sm font-normal"
                            >
                              <Badge variant={status.toLowerCase() as any}>
                                {status.replace("_", " ")}
                              </Badge>{" "}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* URGENCY */}
                    <div className="space-y-2">
                      <Label>Urgency</Label>
                      <div className="flex flex-wrap gap-2">
                        {urgencyOptions.map((urgency) => (
                          <div
                            key={urgency}
                            className="flex items-center space-x-2"
                          >
                            <Checkbox
                              id={`urgency-${urgency}`}
                              checked={selectedUrgencies.includes(urgency)}
                              onCheckedChange={(
                                v: boolean | "indeterminate"
                              ) => {
                                const checked = v === true;
                                setSelectedUrgencies((prev) =>
                                  checked
                                    ? [...prev, urgency]
                                    : prev.filter((u) => u !== urgency)
                                );
                                setCurrentPage(1);
                              }}
                              disabled={isLoading}
                            />
                            <Label
                              htmlFor={`urgency-${urgency}`}
                              className="text-sm font-normal"
                            >
                              <Badge variant={urgency.toLowerCase() as any}>
                                {urgency}
                              </Badge>
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Category</Label>
                      <RadioGroup
                        value={selectedCategory}
                        onValueChange={(value) => setSelectedCategory(value)}
                        defaultValue="all"
                        aria-label="Filter by ticket categories"
                        className="flex flex-wrap gap-4"
                        disabled={isLoading}
                      >
                        <div className="flex flex-wrap gap-2">
                          <RadioGroupItem value={"all"} id={`category-all`} />
                          <Label
                            htmlFor={`category-all`}
                            className="text-sm font-normal"
                          >
                            All
                          </Label>
                        </div>
                        {categories &&
                          categories &&
                          categories.length > 0 &&
                          categories.map((category: TicketCategory) => (
                            <div
                              key={category?.id}
                              className="flex flex-wrap gap-2"
                            >
                              <RadioGroupItem
                                value={category?.id}
                                id={`category-${category?.id}`}
                              />

                              <Label
                                htmlFor={`category-${category?.id}`}
                                className="text-sm font-normal"
                              >
                                {category?.name}
                              </Label>
                            </div>
                          ))}
                      </RadioGroup>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </section>
        </CollapsibleContent>

        <section
          className={`space-y-4 transition-opacity duration-300 ${
            ticketsLoading ? "opacity-50 pointer-events-none" : "opacity-100"
          }`}
        >
          <div className="flex flex-wrap justify-between items-center py-4 px-2 gap-4 w-full">
            <div className="flex flex-wrap items-center space-x-2 gap-4 w-full sm:w-fit">
              <CollapsibleTrigger asChild>
                <ToolTip
                  content={
                    viewDashboardHeader
                      ? "Hide ticket dashboard header"
                      : "Show ticket dashboard header"
                  }
                  trigger={
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label="Toggle ticket dashboard visibility"
                      onClick={() =>
                        setViewDashboardHeader(!viewDashboardHeader)
                      }
                      className={`h-8 w-8 rounded-full`}
                    >
                      {viewDashboardHeader ? (
                        <Eye className="h-5 w-5" />
                      ) : (
                        <EyeClosed className="h-5 w-5" />
                      )}
                    </Button>
                  }
                />
              </CollapsibleTrigger>
              <p className="text-sm text-muted-foreground">
                {selectedStatuses.includes("RESOLVED") &&
                  `${stats?.resolvedTicketsCount ?? 0} resolved tickets`}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="space-y-2 w-full sm:w-fit">
                <Select
                  value={sortBy}
                  onValueChange={(value: TicketSortBy) => setSortBy(value)}
                  disabled={
                    ticketsLoading || !tickets || !tickets.length || isLoading
                  }
                >
                  <SelectTrigger aria-label="Sort by tickets created on date, updated on date, urgency or status">
                    <SelectValue placeholder={"Sort by..."} />
                  </SelectTrigger>

                  <SelectContent>
                    {sortByTicketOptions.map((ticketOption) => (
                      <SelectItem key={ticketOption} value={ticketOption}>
                        <div className="flex gap-1 items-center mr-1">
                          <ArrowDownUp />
                          <p className="text-sm font-medium">
                            {formatTicketOptions(ticketOption)}
                          </p>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 w-full sm:w-fit">
                <Select
                  value={sortDir}
                  onValueChange={(value: OrderBy) => setSortDir(value)}
                  disabled={
                    ticketsLoading || !tickets || !tickets.length || isLoading
                  }
                >
                  <SelectTrigger aria-label="Order by ascending or descending data">
                    <SelectValue placeholder={"Order by..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {orderByOptions.map((direction) => (
                      <SelectItem key={direction} value={direction}>
                        <div className="flex gap-1 items-center mr-1">
                          {direction === "desc" ? <ArrowDown /> : <ArrowUp />}
                          <p className="text-sm font-medium">
                            {formatOrderBy(direction)}
                          </p>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <Table>
            <TableHeader className="bg-muted">
              <TableRow className="border rounded">
                <TableHead className="text-black">Ticket</TableHead>
                <TableHead className="text-black">Assignee</TableHead>
                <TableHead
                  className="text-black cursor-pointer"
                  onClick={() => {
                    setSortBy("status");
                    setSortDir(sortDir === "asc" ? "desc" : "asc");
                    setCurrentPage(1);
                  }}
                >
                  <p className="flex items-center gap-1">
                    {sortBy === "status" && sortDir === "asc" ? (
                      <ArrowUp className="size-4" />
                    ) : sortBy === "status" && sortDir === "desc" ? (
                      <ArrowDown className="size-4" />
                    ) : (
                      <ArrowDownUp className="size-4" />
                    )}
                    Status
                  </p>
                </TableHead>
                <TableHead
                  className="text-black cursor-pointer"
                  onClick={() => {
                    setSortBy("urgency");
                    setSortDir(sortDir === "asc" ? "desc" : "asc");
                    setCurrentPage(1);
                  }}
                >
                  <p className="flex items-center gap-1">
                    {sortBy === "urgency" && sortDir === "asc" ? (
                      <ArrowUp className="size-4" />
                    ) : sortBy === "urgency" && sortDir === "desc" ? (
                      <ArrowDown className="size-4" />
                    ) : (
                      <ArrowDownUp className="size-4" />
                    )}
                    Urgency
                  </p>
                </TableHead>
                <TableHead className="text-black">Category</TableHead>
                <TableHead className="text-center text-black">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="border [&_tr:last-child]:border-0">
              {ticketsLoading && (
                <>
                  {[...Array(5)].map((_, i) => (
                    <TableRow
                      key={i}
                      className="h-16 w-full bg-muted rounded animate-pulse"
                    ></TableRow>
                  ))}
                </>
              )}
              {ticketsLoading && (
                <>
                  {[...Array(5)].map((_, i) => (
                    <TableRow
                      key={i}
                      className="h-16 w-full bg-muted rounded animate-pulse"
                    >
                      <TableCell colSpan={5} className="py-8">
                        <span className="h-4 w-full bg-muted rounded animate-pulse" />
                      </TableCell>
                    </TableRow>
                  ))}
                </>
              )}

              {!ticketsLoading &&
                tickets &&
                tickets.length > 0 &&
                tickets.map((ticket: TicketWithUpdatedAt) => (
                  <TicketListItemWrapper
                    key={ticket.id}
                    ticket={ticket}
                    onClick={() => handleTicketClick(ticket)}
                    onEdit={(e: React.MouseEvent) => handleQuickEdit(e, ticket)}
                    onClose={(e: React.MouseEvent) =>
                      handleQuickClose(e, ticket)
                    }
                    onReopen={() => handleReopenTicket(ticket)}
                  />
                ))}

              {!ticketsLoading && (!tickets || !tickets.length) && (
                <TableRow className="text-center text-muted-foreground">
                  <TableCell colSpan={5} className="py-8">
                    No tickets found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <PagesAndItemsCount
            type="tickets"
            totalItems={totalTickets}
            itemsPerPage={itemsPerPage}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            totalPages={totalPages}
          />
        </section>
      </Collapsible>
      {/* Edit Ticket Modal */}
      <EditTicketForm
        disabled={isLoading}
        ticket={editingTicket}
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSuccess={async (updated) => {
          setIsEditOpen(false);
          setEditingTicket(null);
          if (updated) {
            // optimistic local update of current page
            queryClient.setQueryData<TicketsResponse>(
              agentTicketsQueryKey,
              (prev) => {
                if (!prev) return prev;
                const nextTickets = prev.tickets.map(
                  (t: TicketWithUpdatedAt) =>
                    t.id === (updated as TicketWithUpdatedAt).id
                      ? (updated as TicketWithUpdatedAt)
                      : t
                );
                return { ...prev, tickets: nextTickets };
              }
            );
          }
          await agentTicketsQueryInvalidator();
        }}
      />
      {/* Create Ticket Modal */}
      <CreateTicketForm
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={async () => {
          setIsCreateOpen(false);
          await agentTicketsQueryInvalidator();
        }}
      />
    </>
  );
}
