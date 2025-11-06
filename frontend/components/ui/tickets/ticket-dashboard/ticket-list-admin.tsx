"use client";

import type React from "react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/context/store-provider";
import { useAuth, useUser } from "@clerk/nextjs";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
  UsersResponse,
  TicketCategory,
} from "@/lib/types";
import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";

export default function AdminTicketList() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { permissions, role } = useUserRole();
  const { currentUser } = useStore();

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
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const [selectedAssignee, setSelectedAssignee] = useState<string>(
    role === "AGENT" ? `${currentUser?.id}` : "all"
  );
  const [selectedCreator, setSelectedCreator] = useState<string>("all");
  const [selectedMarketCenterId, setSelectedMarketCenterId] =
    useState<string>("all");
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
    if (selectedCategory !== "all") {
      params.append("categoryId", selectedCategory);
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
    });

  const tickets: TicketWithUpdatedAt[] = ticketsData?.tickets ?? [];
  const totalTickets: number = ticketsData?.total ?? 0;
  const totalPages = calculateTotalPages({
    totalItems: totalTickets,
    itemsPerPage,
  });

  const { data: usersData }: UseQueryResult<UsersResponse, Error> = useQuery<
    UsersResponse,
    Error,
    UsersResponse
  >({
    queryKey: ["users"],
    queryFn: async (): Promise<UsersResponse> => {
      const token = await getToken();
      if (!token) {
        throw new Error("Failed to get authentication token");
      }
      const res = await fetch(`${API_BASE}/users`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const users: PrismaUser[] = usersData?.users ?? [];

  const { data: ticketCategoryData } = useFetchMarketCenterCategories(
    selectedMarketCenterId
  );
  const categories: TicketCategory[] = ticketCategoryData?.categories ?? [];

  const queryInvalidator = () =>
    queryClient.invalidateQueries({ queryKey: ["tickets"] });

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
    onSuccess: () => {
      setSelectedTickets([]);
      setIsAssignModalOpen(false);
      queryInvalidator();
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
    onSuccess: () => {
      setSelectedTickets([]);
      setIsUpdateStatusModalOpen(false);
      queryInvalidator();
    },
  });

  const closeTicketMutation = useMutation({
    mutationFn: async (ticketId: string) => {
      const token = await getToken();
      if (!token) {
        throw new Error("Failed to get authentication token");
      }
      const res = await fetch(`${API_BASE}/tickets/${ticketId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
        body: JSON.stringify({ status: "RESOLVED" as TicketStatus }),
      });
      if (!res.ok) throw new Error("Failed to close ticket");
      return res.json();
    },
    onSuccess: queryInvalidator,
  });

  const handleSelectTicket = (ticketId: string, checked: boolean) => {
    setSelectedTickets((prev) =>
      checked ? [...prev, ticketId] : prev.filter((id) => id !== ticketId)
    );
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedTickets(checked ? tickets.map((t) => t.id) : []);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedStatuses(defaultActiveStatuses);
    setSelectedUrgencies([]);
    setSelectedCategory("all");
    setSelectedAssignee("all");
    setSelectedCreator("all");
    setSelectedMarketCenterId("all");
    setDateFrom(undefined);
    setDateTo(undefined);
    setOpenFrom(false);
    setOpenTo(false);
    setCurrentPage(1);
  };

  const hasActiveFilters =
    !!searchQuery ||
    selectedStatuses.length !== defaultActiveStatuses.length ||
    selectedUrgencies.length > 0 ||
    selectedCategory !== "all" ||
    selectedAssignee !== "all" ||
    selectedCreator !== "all" ||
    selectedMarketCenterId !== "all" ||
    !!dateFrom ||
    !!dateTo ||
    sortDir !== "desc" ||
    sortBy !== "updatedAt";

  const handleQuickEdit = (e: React.MouseEvent, ticket: Ticket) => {
    e.stopPropagation();
    setEditingTicket(ticket);
    setIsEditOpen(true);
  };

  const handleQuickClose = (e: React.MouseEvent, ticketId: string) => {
    e.stopPropagation();
    closeTicketMutation.mutate(ticketId);
  };

  const handleTicketClick = (ticket: Ticket) => {
    queryClient.setQueryData(["ticket", ticket.id], { ticket });
    router.push(`/dashboard/tickets/${ticket.id}`);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <CardTitle className="space-y-2 text-left w-full sm:w-fit">
              Tickets ({totalTickets})
            </CardTitle>

            <div className="flex flex-col-reverse w-full items-center gap-4 sm:flex-row sm:w-fit">
              <TeamSwitcher
                selectedMarketCenterId={selectedMarketCenterId}
                setSelectedMarketCenterId={setSelectedMarketCenterId}
                handleMarketCenterSelected={() => {
                  setSelectedCategory("all");
                  setCurrentPage(1);
                }}
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
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select assignee" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All assignees</SelectItem>
                        <SelectItem value="Unassigned">Unassigned</SelectItem>
                        {users.map((user: PrismaUser) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name}
                          </SelectItem>
                        ))}
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
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select creator" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All creators</SelectItem>
                        {users.map((user: PrismaUser) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

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
                            {status.replace("_", " ")}
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
                            {urgency}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  {selectedMarketCenterId &&
                    selectedMarketCenterId !== "all" && (
                      <div className="space-y-2 lg:col-span-3">
                        <Label>Category</Label>
                        <RadioGroup
                          value={selectedCategory}
                          onValueChange={(value) => setSelectedCategory(value)}
                          defaultValue="all"
                          aria-label="Filter by ticket categories"
                          className="flex flex-wrap gap-4 items-center"
                        >
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value={"all"} id={`category-all`} />
                            <Label
                              htmlFor={`category-all`}
                              className="text-sm font-normal"
                            >
                              All
                            </Label>
                          </div>
                          {categories &&
                            categories.length > 0 &&
                            categories.map((category: TicketCategory) => {
                              return (
                                <div
                                  key={category?.id}
                                  className="flex items-center gap-2"
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
                              );
                            })}
                        </RadioGroup>
                      </div>
                    )}
                </div>
              </Card>
            )}
          </div>
        </CardHeader>

        <CardContent>
          <div
            className={`space-y-4 transition-opacity duration-300 ${
              ticketsLoading ? "opacity-50 pointer-events-none" : "opacity-100"
            }`}
          >
            <div className="flex flex-wrap justify-between items-center pb-2 border-b gap-4 w-full">
              {permissions?.canBulkUpdate && (
                <div className="w-full sm:w-fit h-9 px-4 py-2 has-[>svg]:px-3 inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[color,box-shadow] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] border border-input bg-background shadow-xs hover:bg-accent hover:text-accent-foreground">
                  <Checkbox
                    checked={
                      selectedTickets.length === tickets.length &&
                      tickets.length > 0
                    }
                    onCheckedChange={(v: boolean | "indeterminate") =>
                      handleSelectAll(v === true)
                    }
                  />
                  <span className="text-sm font-medium">Select All</span>
                </div>
              )}
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
            </div>

            {ticketsLoading && (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="h-16 bg-muted rounded animate-pulse"
                  ></div>
                ))}
              </div>
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
                  onClose={(e: React.MouseEvent) =>
                    handleQuickClose(e, ticket.id)
                  }
                  onClick={() => handleTicketClick(ticket)}
                />
              ))}

            {!ticketsLoading && (!tickets || !tickets.length) && (
              <div className="text-center py-8 text-muted-foreground">
                No tickets found.
              </div>
            )}
            <PagesAndItemsCount
              type="tickets"
              totalItems={totalTickets}
              itemsPerPage={itemsPerPage}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              totalPages={totalPages}
            />
            {/* <div className="flex items-center justify-between pt-4">
              <div className="text-sm text-muted-foreground">
                Showing{" "}
                {formatPaginationText({
                  totalItems: totalTickets,
                  itemsPerPage,
                  currentPage,
                })}{" "}
                of {totalTickets} tickets
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => p - 1)}
                  disabled={currentPage === 1 || totalTickets === 0}
                  type="button"
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </Button>
                <span className="text-sm">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => p + 1)}
                  disabled={currentPage === totalPages || totalTickets === 0}
                  type="button"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div> */}
          </div>
        </CardContent>
      </Card>

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
                {statusOptions.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status.replace("_", " ")}
                  </SelectItem>
                ))}
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
          await queryInvalidator();
        }}
      />

      {/* Create Ticket Modal */}
      <CreateTicketForm
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={async (created) => {
          setIsCreateOpen(false);
          await queryInvalidator();
        }}
      />
    </>
  );
}
