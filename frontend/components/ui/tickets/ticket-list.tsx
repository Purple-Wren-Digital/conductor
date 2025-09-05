"use client";

import type React from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog/base-dialog";
import {
  Search,
  Filter,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
  Plus,
} from "lucide-react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { format, startOfDay, endOfDay } from "date-fns";
import type { Ticket, TicketStatus, Urgency, User } from "@/lib/types";
import { EditTicketForm } from "./ticket-form/edit-ticket-form";
import { CreateTicketForm } from "./ticket-form/create-ticket-form";
import { getAccessToken } from "@auth0/nextjs-auth0";
import { useUserRole } from "@/lib/hooks/use-user-role";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
  type UseQueryResult,
} from "@tanstack/react-query";

import { TicketListItemWrapper } from "@/components/ui/tickets/ticket-list-item-wrapper";
import { TeamSwitcher } from "@/components/ui/team-switcher";

const statusOptions: TicketStatus[] = [
  "ASSIGNED",
  "AWAITING_RESPONSE",
  "IN_PROGRESS",
  "RESOLVED",
];
const urgencyOptions: Urgency[] = ["HIGH", "MEDIUM", "LOW"];

type SortBy = "updatedAt" | "createdAt" | "urgency" | "status";
type SortDir = "asc" | "desc";

type TicketWithUpdatedAt = Ticket & { updatedAt?: string | Date };

type TicketsResponse = { tickets: TicketWithUpdatedAt[]; total: number };
type UsersResponse = { users: User[] };

const defaultActiveStatuses: TicketStatus[] = [
  "ASSIGNED",
  "AWAITING_RESPONSE",
  "IN_PROGRESS",
];

export function TicketList() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { permissions, role } = useUserRole();

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
  const [selectedAssignee, setSelectedAssignee] = useState<string>("all");
  const [selectedCreator, setSelectedCreator] = useState<string>("all");
  const [selectedMarketCenterId, setSelectedMarketCenterId] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();

  const [openFrom, setOpenFrom] = useState(false);
  const [openTo, setOpenTo] = useState(false);

  const [sortBy, setSortBy] = useState<SortBy>("updatedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isUpdateStatusModalOpen, setIsUpdateStatusModalOpen] = useState(false);
  const [bulkAssigneeId, setBulkAssigneeId] = useState<string>("");
  const [bulkStatus, setBulkStatus] = useState<TicketStatus | "">("");

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const getAuthToken = useCallback(async () => {
    if (process.env.NODE_ENV === "development") return "local";
    return await getAccessToken();
  }, []);

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (debouncedSearchQuery) params.append("query", debouncedSearchQuery);
    selectedStatuses.forEach((s) => params.append("status", s));
    selectedUrgencies.forEach((u) => params.append("urgency", u));
    if (selectedAssignee !== "all")
      params.append("assigneeId", selectedAssignee);
    if (selectedCreator !== "all") params.append("creatorId", selectedCreator);
    if (selectedMarketCenterId && role === "ADMIN") params.append("marketCenterId", selectedMarketCenterId);
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
    selectedAssignee,
    selectedCreator,
    selectedMarketCenterId,
    role,
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
  const ticketsQueryKey = useMemo(
    () => ["tickets", queryKeyParams] as const,
    [queryKeyParams]
  );

  const {
    data: ticketsData,
    isFetching: ticketsLoading,
  }: UseQueryResult<TicketsResponse, Error> = useQuery<
    TicketsResponse,
    Error,
    TicketsResponse,
    typeof ticketsQueryKey
  >({
    queryKey: ticketsQueryKey,
    queryFn: async (): Promise<TicketsResponse> => {
      const accessToken = await getAuthToken();
      const res = await fetch(`/api/tickets/search?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to fetch tickets");
      return res.json();
    },
    placeholderData: keepPreviousData,
    refetchInterval: 15000,
  });

  const tickets: TicketWithUpdatedAt[] = ticketsData?.tickets ?? [];
  const totalTickets: number = ticketsData?.total ?? 0;
  const totalPages = Math.ceil(totalTickets / itemsPerPage);

  const { data: usersData }: UseQueryResult<UsersResponse, Error> = useQuery<
    UsersResponse,
    Error,
    UsersResponse
  >({
    queryKey: ["users"],
    queryFn: async (): Promise<UsersResponse> => {
      const accessToken = await getAuthToken();
      const res = await fetch("/api/users", {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const users: User[] = usersData?.users ?? [];

  const queryInvalidator = () =>
    queryClient.invalidateQueries({ queryKey: ["tickets"] });

  const bulkAssignMutation = useMutation({
    mutationFn: async (payload: {
      ticketIds: string[];
      assigneeId: string;
    }) => {
      const accessToken = await getAuthToken();
      const res = await fetch("/api/tickets/bulk-assign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
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
      const accessToken = await getAuthToken();
      const res = await fetch("/api/tickets/bulk-update", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
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
      const accessToken = await getAuthToken();
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
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
    setSelectedAssignee("all");
    setSelectedCreator("all");
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
    selectedAssignee !== "all" ||
    selectedCreator !== "all" ||
    !!dateFrom ||
    !!dateTo;

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
          <div className="flex items-center justify-between">
            <CardTitle>Tickets ({totalTickets})</CardTitle>

            <div className="flex items-center gap-4">
              {role === "ADMIN" && (
                <TeamSwitcher 
                  selectedMarketCenterId={selectedMarketCenterId}
                  onMarketCenterChange={(id) => {
                    setSelectedMarketCenterId(id);
                    setCurrentPage(1);
                  }}
                />
              )}
              
              {permissions?.canCreateTicket && (
                <Button className="gap-2" onClick={() => setIsCreateOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Create Ticket
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-4 mt-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
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
                className="gap-2 bg-transparent"
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
                  className="gap-2"
                  type="button"
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
                        {users.map((user: User) => (
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
                        {users.map((user: User) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name}
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
                          initialFocus
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
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {ticketsLoading && tickets.length === 0 ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="h-16 bg-muted rounded animate-pulse"
                ></div>
              ))}
            </div>
          ) : (
            <div
              className={`space-y-4 transition-opacity duration-300 ${
                ticketsLoading
                  ? "opacity-50 pointer-events-none"
                  : "opacity-100"
              }`}
            >
              {permissions?.canBulkUpdate && (
                <div className="flex items-center space-x-2 pb-2 border-b">
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

              {tickets.map((ticket: TicketWithUpdatedAt) => (
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

              {totalTickets === 0 && !ticketsLoading && (
                <div className="text-center py-8 text-muted-foreground">
                  No tickets found.
                </div>
              )}

              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                    {Math.min(currentPage * itemsPerPage, totalTickets)} of{" "}
                    {totalTickets} tickets
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => p - 1)}
                      disabled={currentPage === 1}
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
                      disabled={currentPage === totalPages}
                      type="button"
                    >
                      Next <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
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
                {users.map((user: User) => (
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
        onSuccess={(updated) => {
          setIsEditOpen(false);
          setEditingTicket(null);
          if (updated) {
            // optimistic local update of current page
            queryClient.setQueryData<TicketsResponse>(
              ticketsQueryKey,
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
          queryInvalidator();
        }}
      />

      {/* Create Ticket Modal */}
      <CreateTicketForm
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => {
          setIsCreateOpen(false);
          queryInvalidator();
        }}
      />
    </>
  );
}
