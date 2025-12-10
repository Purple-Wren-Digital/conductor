"use client";

import type React from "react";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import PagesAndItemsCount from "@/components/ui/pagination/page-and-items-count";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CreateTicketForm } from "@/components/ui/tickets/ticket-form/create-ticket-form";
import { EditTicketForm } from "@/components/ui/tickets/ticket-form/edit-ticket-form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TicketListItemWrapper } from "@/components/ui/tickets/ticket-list-item-wrapper";
import { TeamSwitcher } from "@/components/ui/team-switcher";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog/base-dialog";
import { format, startOfDay, endOfDay } from "date-fns";
import { useFetchMarketCenterCategories } from "@/hooks/use-market-center";
import { useFetchAdminTickets } from "@/hooks/use-tickets";
import { useUserRole } from "@/hooks/use-user-role";
import { API_BASE } from "@/lib/api/utils";
import {
  calculateTotalPages,
  defaultActiveStatuses,
  formatOrderBy,
  formatTicketOptions,
  getResolvedInBusinessDays,
  orderByOptions,
  sortByTicketOptions,
  statusOptions,
  urgencyOptions,
} from "@/lib/utils";
import {
  ArrowDown,
  ArrowUp,
  ArrowDownUp,
  CalendarIcon,
  Filter,
  Plus,
  Search,
  X,
} from "lucide-react";
import type {
  Ticket,
  TicketStatus,
  Urgency,
  PrismaUser,
  OrderBy,
  TicketSortBy,
  TicketsResponse,
  TicketWithUpdatedAt,
  TicketCategory,
  UsersToNotify,
} from "@/lib/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createAndSendNotification } from "@/lib/utils/notifications";
import { ActivityUpdates } from "@/packages/transactional/emails/types";
import { toast } from "sonner";
import { useFetchAllUsers } from "@/hooks/use-users";

type CategoryOption = { label: string; ids: string[] };

export default function AdminTicketList() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { role } = useUserRole();

  const defaultSelectedCategory: CategoryOption = useMemo(
    () => ({ label: "all", ids: [] }),
    []
  );

  const [isLoading, setIsLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const [selectedTickets, setSelectedTickets] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
  const [selectedStatuses, setSelectedStatuses] = useState<TicketStatus[]>(
    defaultActiveStatuses
  );
  const [selectedUrgencies, setSelectedUrgencies] = useState<Urgency[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<CategoryOption>(
    defaultSelectedCategory
  );

  const [selectedAssignee, setSelectedAssignee] = useState<string>("all");
  const [selectedCreator, setSelectedCreator] = useState<string>("all");
  const [selectedMarketCenterId, setSelectedMarketCenterId] =
    useState<string>("all");
  const [marketCenters, setMarketCenters] = useState<
    { name: string; id: string }[]
  >([]);

  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();

  const [openFrom, setOpenFrom] = useState(false);
  const [openTo, setOpenTo] = useState(false);

  const [sortBy, setSortBy] = useState<TicketSortBy>("updatedAt");
  const [sortDir, setSortDir] = useState<OrderBy>("desc");

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isUpdateStatusModalOpen, setIsUpdateStatusModalOpen] = useState(false);
  const [bulkAssigneeId, setBulkAssigneeId] = useState<string>("");
  const [bulkStatus, setBulkStatus] = useState<TicketStatus | "">("");

  const { getToken } = useAuth();

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // FILTERS STATE PERSISTENCE
  useEffect(() => {
    if (!hydrated) return; // prevents overwrite on load
    localStorage.setItem(
      "ticket-filters",
      JSON.stringify({
        searchQuery,
        selectedStatuses,
        selectedUrgencies,
        selectedCategory,
        selectedAssignee,
        selectedCreator,
        selectedMarketCenterId,
        dateFrom: dateFrom ? dateFrom.toISOString() : null,
        dateTo: dateTo ? dateTo.toISOString() : null,
        showFilters,
        openFrom,
        openTo,
        sortBy,
        sortDir,
        currentPage,
      })
    );
  }, [
    hydrated,
    searchQuery,
    selectedStatuses,
    selectedUrgencies,
    selectedCategory,
    selectedAssignee,
    selectedCreator,
    selectedMarketCenterId,
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

      setSearchQuery(fetchedFilters.searchQuery || "");
      setSelectedStatuses(
        fetchedFilters.selectedStatuses || defaultActiveStatuses
      );
      setSelectedUrgencies(fetchedFilters.selectedUrgencies || []);
      setSelectedCategory(fetchedFilters.selectedCategory || "all");
      setSelectedAssignee(fetchedFilters.selectedAssignee || "all");
      setSelectedCreator(fetchedFilters.selectedCreator || "all");
      setSelectedMarketCenterId(fetchedFilters.selectedMarketCenterId || "all");
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

  // TICKETS QUERY PARAMS
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();

    if (debouncedSearchQuery) params.append("query", debouncedSearchQuery);
    selectedStatuses.forEach((s) => params.append("status", s));
    selectedUrgencies.forEach((u) => params.append("urgency", u));
    if (selectedAssignee !== "all")
      params.append("assigneeId", selectedAssignee);
    if (selectedCreator !== "all") params.append("creatorId", selectedCreator);
    if (selectedMarketCenterId !== "all") {
      params.append("marketCenterId", selectedMarketCenterId);
    }
    if (
      selectedCategory &&
      selectedCategory?.label !== "all" &&
      selectedCategory?.ids &&
      selectedCategory?.ids.length > 0
    ) {
      selectedCategory.ids.forEach((categoryId) =>
        params.append("categoryIdsMultiple", categoryId)
      );
    }
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
    selectedCreator,
    selectedMarketCenterId,
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
  const adminTicketsQueryKey = useMemo(
    () => ["admin-tickets", queryKeyParams] as const,
    [queryKeyParams]
  );

  const { data: ticketsData, isFetching: ticketsLoading } =
    useFetchAdminTickets({
      role,
      adminTicketsQueryKey,
      queryParams,
      hydrated,
    });

  const tickets: TicketWithUpdatedAt[] = useMemo(() => {
    return ticketsData?.tickets ?? [];
  }, [ticketsData]);
  const totalTickets: number = ticketsData?.total ?? 0;
  const totalPages = calculateTotalPages({
    totalItems: totalTickets,
    itemsPerPage,
  });

  const { data: usersData, isLoading: usersLoading } = useFetchAllUsers({
    usersQueryKey: [
      "admin-users-ticket-list",
      { marketCenterId: selectedMarketCenterId },
    ],
    role: role,
  });
  const users: PrismaUser[] = useMemo(
    () => usersData?.users ?? [],
    [usersData]
  );

  const { data: ticketCategoryData } = useFetchMarketCenterCategories(
    selectedMarketCenterId
  );
  const categories: TicketCategory[] = useMemo(
    () => ticketCategoryData?.categories ?? [],
    [ticketCategoryData]
  );
  const groupedCategories: Record<string, string[]> = useMemo(() => {
    const map: Record<string, string[]> = {};

    categories?.forEach((category) => {
      if (!map[category.name]) {
        map[category.name] = [];
      }
      map[category.name].push(category.id);
    });

    return map;
  }, [categories]);

  const categoryOptions = useMemo(() => {
    return Object.entries(groupedCategories).map(([name, ids]) => ({
      label: name,
      ids,
    }));
  }, [groupedCategories]);

  const adminTicketsQueryInvalidator = () =>
    queryClient.invalidateQueries({ queryKey: adminTicketsQueryKey });

  const bulkAssignMutation = useMutation({
    mutationFn: async (payload: {
      ticketIds: string[];
      assigneeId: string;
    }) => {
      const token = await getToken();
      if (!token) {
        throw new Error("Failed to get authentication token");
      }
      const res = await fetch(`${API_BASE}/tickets/bulk-assign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to bulk assign tickets");
      return res.json();
    },
    onSuccess: async () => {
      setSelectedTickets([]);
      setIsAssignModalOpen(false);
      await adminTicketsQueryInvalidator();
    },
  });

  const bulkStatusMutation = useMutation({
    mutationFn: async (payload: {
      ticketIds: string[];
      status: TicketStatus;
    }) => {
      const token = await getToken();
      if (!token) {
        throw new Error("Failed to get authentication token");
      }
      const res = await fetch(`${API_BASE}/tickets/bulk-update`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        let message = "Failed to bulk update status";
        try {
          const j = await res.json();
          message = j.message || message;
        } catch {}
        throw new Error(message);
      }
      return res.json();
    },
    onSuccess: async () => {
      setSelectedTickets([]);
      setIsUpdateStatusModalOpen(false);
      await adminTicketsQueryInvalidator();
    },
  });

  const handleSelectTicket = (ticketId: string, checked: boolean) => {
    setSelectedTickets((prev) =>
      checked ? [...prev, ticketId] : prev.filter((id) => id !== ticketId)
    );
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedTickets(checked ? tickets.map((t) => t.id) : []);
  };

  const handleSendTicketClosedNotifications = async ({
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
        "TicketListAdmin - Unable to generate Survey notifications",
        error
      );
    }
  };

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
      await adminTicketsQueryInvalidator();
      setIsLoading(false);
    },
  });

  const handleQuickClose = (e: React.MouseEvent, ticket: Ticket) => {
    e.stopPropagation();
    closeTicketMutation.mutate(ticket);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedStatuses(defaultActiveStatuses);
    setSelectedUrgencies([]);
    setSelectedCategory(defaultSelectedCategory);
    setSelectedAssignee("all");
    setSelectedCreator("all");
    setSelectedMarketCenterId("all");
    setDateFrom(undefined);
    setDateTo(undefined);
    setOpenFrom(false);
    setOpenTo(false);
    setCurrentPage(1);
    setSortBy("updatedAt");
    setSortDir("desc");
  };

  const hasActiveFilters = useMemo(() => {
    return (
      !!searchQuery ||
      selectedStatuses.length !== defaultActiveStatuses.length ||
      selectedUrgencies.length > 0 ||
      (selectedCategory.label !== "all" &&
        selectedCategory?.ids &&
        selectedCategory.ids.length > 0) ||
      selectedMarketCenterId !== "all" ||
      selectedAssignee !== "all" ||
      selectedCreator !== "all" ||
      selectedMarketCenterId !== "all" ||
      !!dateFrom ||
      !!dateTo ||
      sortDir !== "desc" ||
      sortBy !== "updatedAt"
    );
  }, [
    searchQuery,
    selectedStatuses,
    selectedUrgencies,
    selectedCategory,
    selectedAssignee,
    selectedCreator,
    selectedMarketCenterId,
    dateFrom,
    dateTo,
    sortDir,
    sortBy,
  ]);

  const handleQuickEdit = (e: React.MouseEvent, ticket: Ticket) => {
    e.stopPropagation();
    setEditingTicket(ticket);
    setIsEditOpen(true);
  };

  const handleTicketClick = (ticket: Ticket) => {
    queryClient.setQueryData(["ticket", ticket.id], { ticket });
    router.push(`/dashboard/tickets/${ticket.id}`);
  };

  const stats = useMemo(() => {
    const resolvedTicketsCount = tickets.filter(
      (t: Ticket) => t.status === "RESOLVED"
    ).length;

    const now = new Date();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(now.getDate() - 7);

    let totalBusinessDays = 0;

    tickets.forEach((t: Ticket) => {
      const status = t.status;
      const createdDate = t.createdAt ? new Date(t.createdAt) : null;
      const resolvedDate = t.resolvedAt ? new Date(t.resolvedAt) : null;

      if (status === "RESOLVED" && createdDate && resolvedDate) {
        totalBusinessDays += getResolvedInBusinessDays(
          createdDate,
          resolvedDate
        );
      }
    });

    const avgResolutionBusinessDays = resolvedTicketsCount
      ? Number((totalBusinessDays / resolvedTicketsCount).toFixed(2))
      : 0;

    return {
      resolvedTicketsCount,
      avgResolutionBusinessDays,
    };
  }, [tickets]);

  const findMarketCenterName = (id: string | null, role?: string) => {
    if (role === "ADMIN") return "Global";
    if (!id) return "No Market Center";
    const mc = marketCenters && marketCenters.find((mc) => mc.id === id);
    return mc && mc?.name ? mc.name : `#${id.slice(0, 8)}`;
  };

  return (
    <>
      <section className="space-y-4">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <h1 className="text-xl font-bold text-left w-full sm:w-fit">
            Tickets ({totalTickets})
          </h1>

          <div className="flex flex-col-reverse w-full items-center gap-4 sm:flex-row sm:w-fit">
            <TeamSwitcher
              selectedMarketCenterId={selectedMarketCenterId}
              setSelectedMarketCenterId={setSelectedMarketCenterId}
              handleMarketCenterSelected={() => {
                setSelectedCategory(defaultSelectedCategory);
                setCurrentPage(1);
              }}
              setMarketCenters={setMarketCenters}
            />
            <Button
              className="gap-2 w-full sm:w-fit"
              onClick={() => setIsCreateOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Create Ticket
            </Button>
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
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 bg-transparent w-full sm:w-fit"
              onClick={() => setShowFilters(!showFilters)}
              type="button"
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
              >
                <X className="h-4 w-4" />
                Clear
              </Button>
            )}
          </div>

          {showFilters && (
            <Card className="p-4 bg-muted/50">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <Label>Assignee</Label>
                  <Select
                    value={selectedAssignee}
                    onValueChange={(v) => {
                      setSelectedAssignee(v);
                      setCurrentPage(1);
                    }}
                    disabled={usersLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select assignee" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        {usersLoading ? "Loading..." : "All assignees"}
                      </SelectItem>
                      <SelectItem value="Unassigned">Unassigned</SelectItem>
                      {!usersLoading &&
                        users.map((user: PrismaUser) => {
                          const marketCenterName = findMarketCenterName(
                            user?.marketCenterId,
                            user?.role
                          );
                          return (
                            <SelectItem key={user.id} value={user.id}>
                              <div className="flex flex-col gap-0.5">
                                {user.name}
                                <span className="text-xs text-muted-foreground capitalize">
                                  {user?.role
                                    ? user.role
                                        .split("_")
                                        .join(" ")
                                        .toLowerCase()
                                    : "No role"}{" "}
                                  • {marketCenterName}
                                </span>
                              </div>
                            </SelectItem>
                          );
                        })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Creator</Label>
                  <Select
                    value={selectedCreator}
                    onValueChange={(v) => {
                      setSelectedCreator(v);
                      setCurrentPage(1);
                    }}
                    disabled={usersLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select creator" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        {usersLoading ? "Loading..." : "All creators"}
                      </SelectItem>
                      {!usersLoading &&
                        users.map((user: PrismaUser) => {
                          return (
                            <SelectItem key={user.id} value={user.id}>
                              <div className="flex flex-col gap-0.5">
                                {user.name}
                                <span className="text-xs text-muted-foreground capitalize">
                                  {user?.role
                                    ? user.role
                                        .split("_")
                                        .join(" ")
                                        .toLowerCase()
                                    : "No role"}{" "}
                                  •{" "}
                                  {findMarketCenterName(
                                    user?.marketCenterId,
                                    user?.role
                                  )}
                                </span>
                              </div>
                            </SelectItem>
                          );
                        })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 lg:row-span-3">
                  <Label>Status</Label>
                  <div className="flex flex-wrap gap-2">
                    {statusOptions.map((status) => (
                      <div key={status} className="flex items-center space-x-2">
                        <Checkbox
                          id={`status-${status}`}
                          checked={selectedStatuses.includes(status)}
                          onCheckedChange={(v: boolean | "indeterminate") => {
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
                          </Badge>
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Date From</Label>
                  <Popover open={openFrom} onOpenChange={setOpenFrom}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-start text-left font-normal bg-transparent"
                        onClick={() => setOpenFrom(true)}
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

                <div className="space-y-2">
                  <Label>Date To</Label>
                  <Popover open={openTo} onOpenChange={setOpenTo}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-start text-left font-normal bg-transparent"
                        onClick={() => setOpenTo(true)}
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

                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    defaultValue={"all"}
                    value={selectedCategory?.label}
                    onValueChange={(value) => {
                      if (value === "all") {
                        setSelectedCategory(defaultSelectedCategory);
                        setCurrentPage(1);
                        return;
                      }
                      const selected: CategoryOption | undefined =
                        categoryOptions.find((c) => c.label === value);
                      if (
                        selected &&
                        selected?.label &&
                        selected?.ids &&
                        selected?.ids.length > 0
                      ) {
                        setSelectedCategory(selected);
                        setCurrentPage(1);
                      }
                    }}
                    aria-label="Filter by ticket categories"
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        All Categories ({categoryOptions?.length ?? 0})
                      </SelectItem>
                      {categoryOptions.map((option) => (
                        <SelectItem key={option.label} value={option.label}>
                          {option?.label ?? "Unlabeled"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

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
                          onCheckedChange={(v: boolean | "indeterminate") => {
                            const checked = v === true;
                            setSelectedUrgencies((prev) =>
                              checked
                                ? [...prev, urgency]
                                : prev.filter((u) => u !== urgency)
                            );
                            setCurrentPage(1);
                          }}
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
              </div>
            </Card>
          )}
        </div>
      </section>

      <section className="flex flex-wrap justify-between items-center py-4 px-2 gap-4 w-full">
        <p className="text-sm text-muted-foreground">
          Avg Resolution:{" "}
          {selectedStatuses.includes("RESOLVED")
            ? `${stats?.avgResolutionBusinessDays ?? 0} business days`
            : "N/A"}
        </p>
        <div className="flex flex-wrap items-center space-x-2 gap-4 w-full sm:w-fit">
          {/* SORT BY */}
          <div className="space-y-2 w-full sm:w-fit">
            <Select
              value={sortBy}
              onValueChange={(value: TicketSortBy) => {
                setSortBy(value);
                setCurrentPage(1);
              }}
              disabled={ticketsLoading || !tickets || !tickets.length}
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
          {/* ORDER BY */}
          <div className="space-y-2 w-full sm:w-fit">
            <Select
              value={sortDir}
              onValueChange={(value: OrderBy) => {
                setSortDir(value);
                setCurrentPage(1);
              }}
              disabled={ticketsLoading || !tickets || !tickets.length}
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
      </section>

      <section
        className={`"flex flex-col gap-5 overflow-x-auto" space-y-4 transition-opacity duration-300 ${
          ticketsLoading ? "opacity-50 pointer-events-none" : "opacity-100"
        }`}
      >
        <Table>
          <TableHeader className="bg-muted">
            <TableRow className="border rounded">
              <TableHead className="text-black cursor-pointer">
                <Checkbox
                  className="mr-2 bg-white"
                  checked={
                    selectedTickets.length === tickets.length &&
                    tickets.length > 0
                  }
                  onCheckedChange={(v: boolean | "indeterminate") =>
                    handleSelectAll(v === true)
                  }
                />
                Ticket
              </TableHead>
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
              <TableHead className="text-center text-black">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="border [&_tr:last-child]:border-0">
            {ticketsLoading && (
              <>
                {[...Array(5)].map((_, i) => (
                  <TableRow
                    key={i}
                    className="h-16 w-full bg-muted rounded animate-pulse"
                  >
                    <TableCell colSpan={5} className="py-8">
                      <div className="h-4 w-full bg-muted rounded animate-pulse" />
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
                  selected={selectedTickets.includes(ticket.id)}
                  onSelect={(checked: boolean) =>
                    handleSelectTicket(ticket.id, checked)
                  }
                  onEdit={(e: React.MouseEvent) => handleQuickEdit(e, ticket)}
                  onClose={(e: React.MouseEvent) => handleQuickClose(e, ticket)}
                  onClick={() => handleTicketClick(ticket)}
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

      {/* Bulk Assign Modal */}
      <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Tickets</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p>Assign {selectedTickets.length} selected ticket(s) to:</p>
            <Select onValueChange={setBulkAssigneeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a user..." />
              </SelectTrigger>
              <SelectContent>
                {users.map((user: PrismaUser) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAssignModalOpen(false)}
              type="button"
            >
              Cancel
            </Button>
            <Button
              onClick={() =>
                bulkAssignMutation.mutate({
                  ticketIds: selectedTickets,
                  assigneeId: bulkAssigneeId,
                })
              }
              disabled={
                !bulkAssigneeId ||
                selectedTickets.length === 0 ||
                bulkAssignMutation.isPending
              }
              type="button"
            >
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Update Status Modal */}
      <Dialog
        open={isUpdateStatusModalOpen}
        onOpenChange={setIsUpdateStatusModalOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Ticket Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p>Update {selectedTickets.length} selected ticket(s) to status:</p>
            <Select
              onValueChange={(value) => setBulkStatus(value as TicketStatus)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a status..." />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((status) => {
                  if (status === "RESOLVED") return null;
                  return (
                    <SelectItem key={status} value={status}>
                      <Badge variant={status.toLowerCase() as any}>
                        {status.replace("_", " ")}
                      </Badge>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsUpdateStatusModalOpen(false)}
              type="button"
            >
              Cancel
            </Button>
            <Button
              onClick={() =>
                bulkStatusMutation.mutate({
                  ticketIds: selectedTickets,
                  status: bulkStatus as TicketStatus,
                })
              }
              disabled={
                !bulkStatus ||
                selectedTickets.length === 0 ||
                bulkStatusMutation.isPending
              }
              type="button"
            >
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Edit Modal */}
      <EditTicketForm
        disabled={isLoading}
        ticket={editingTicket}
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSuccess={async (updated) => {
          if (updated) {
            // optimistic local update of current page
            queryClient.setQueryData<TicketsResponse>(
              adminTicketsQueryKey,
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
          setIsEditOpen(false);
          setEditingTicket(null);
          await adminTicketsQueryInvalidator();
        }}
      />

      {/* Create Ticket Modal */}
      <CreateTicketForm
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={async (created) => {
          setIsCreateOpen(false);
          await adminTicketsQueryInvalidator();
        }}
      />
    </>
  );
}
