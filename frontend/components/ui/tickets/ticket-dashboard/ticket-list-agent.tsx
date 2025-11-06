"use client";

import type React from "react";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/context/store-provider";
import { Calendar } from "@/components/ui/calendar";
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
import { TicketListItemWrapper } from "@/components/ui/tickets/ticket-list-item-wrapper";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { format, startOfDay, endOfDay } from "date-fns";
import { useFetchAgentTickets } from "@/hooks/use-tickets";
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
  ArrowDownUp,
  ArrowUp,
  CalendarIcon,
  Filter,
  Search,
  X,
} from "lucide-react";
import type {
  Ticket,
  TicketStatus,
  Urgency,
  OrderBy,
  TicketSortBy,
  TicketsResponse,
  TicketWithUpdatedAt,
  TicketCategory,
} from "@/lib/types";
import { useQueryClient, UseQueryResult } from "@tanstack/react-query";
import PagesAndItemsCount from "../../pagination/page-and-items-count";
import { useFetchMarketCenterCategories } from "@/hooks/use-market-center";
import { RadioGroup, RadioGroupItem } from "../../radio-group";

export default function AgentTicketList() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { currentUser } = useStore();

  const [showFilters, setShowFilters] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
  const [selectedStatuses, setSelectedStatuses] = useState<TicketStatus[]>(
    defaultActiveStatuses
  );
  const [selectedUrgencies, setSelectedUrgencies] = useState<Urgency[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();

  const [openFrom, setOpenFrom] = useState(false);
  const [openTo, setOpenTo] = useState(false);

  const [sortBy, setSortBy] = useState<TicketSortBy>("updatedAt");
  const [sortDir, setSortDir] = useState<OrderBy>("desc");

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

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

  const {
    data: ticketsData,
    isFetching: ticketsLoading,
  }: UseQueryResult<TicketsResponse, Error> = useFetchAgentTickets({
    queryParams,
    agentTicketsQueryKey,
    userId: currentUser?.id,
  });

  const tickets: TicketWithUpdatedAt[] = ticketsData?.tickets ?? [];
  const totalTickets = tickets?.length ?? 0;
  const totalPages = calculateTotalPages({
    totalItems: totalTickets,
    itemsPerPage,
  });

  const { data: ticketCategoryData } = useFetchMarketCenterCategories(
    currentUser?.marketCenterId ?? ""
  );
  const categories: TicketCategory[] = ticketCategoryData?.categories ?? [];

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedStatuses(defaultActiveStatuses);
    setSelectedUrgencies([]);
    setSelectedCategory("all");
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
    !!dateFrom ||
    !!dateTo ||
    sortDir !== "desc" ||
    sortBy !== "updatedAt";

  const handleTicketClick = (ticket: Ticket) => {
    queryClient.setQueryData(["ticket", ticket.id], { ticket });
    router.push(`/dashboard/tickets/${ticket.id}`);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 items-center justify-between sm:flex-row">
          <CardTitle className="space-y-2 text-left w-full sm:w-fit">
            Assigned Tickets ({totalTickets})
          </CardTitle>
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
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <Label>Assignee</Label>
                  <Select disabled={true}>
                    <SelectTrigger>
                      <SelectValue placeholder={`${currentUser?.name} (You)`} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={`${currentUser?.name} (You)`} />
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
                {/* STATUS */}
                <div className="space-y-2">
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
                          {status.replace("_", " ")}
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
                  <Label>Category</Label>
                  <RadioGroup
                    value={selectedCategory}
                    onValueChange={(value) => setSelectedCategory(value)}
                    defaultValue="all"
                    aria-label="Filter by ticket categories"
                    className="flex flex-wrap gap-4"
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
      </CardHeader>

      <CardContent>
        <div
          className={`space-y-4 transition-opacity duration-300 ${
            ticketsLoading ? "opacity-50 pointer-events-none" : "opacity-100"
          }`}
        >
          <div className="flex flex-wrap items-center pb-2 border-b space-x-2 gap-4 w-full">
            <div className="space-y-2 w-full sm:w-fit">
              <Select
                value={sortBy}
                onValueChange={(value: TicketSortBy) => setSortBy(value)}
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
            <div className="space-y-2 w-full sm:w-fit">
              <Select
                value={sortDir}
                onValueChange={(value: OrderBy) => setSortDir(value)}
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

          {ticketsLoading && (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-muted rounded animate-pulse" />
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
        </div>
      </CardContent>
    </Card>
  );
}
