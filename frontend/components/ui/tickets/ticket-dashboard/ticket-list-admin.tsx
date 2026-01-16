"use client";

import type React from "react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import {
  useFetchAllMarketCenters,
  useFetchMarketCenterCategories,
} from "@/hooks/use-market-center";
import { useFetchAdminTickets } from "@/hooks/use-tickets";
import { useUserRole } from "@/hooks/use-user-role";
import { API_BASE } from "@/lib/api/utils";
import {
  calculateTotalPages,
  defaultActiveStatuses,
  formatOrderBy,
  formatTicketOptions,
  orderByOptions,
  sortByRoleThenName,
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
  Eye,
  EyeClosed,
  Users,
  Save,
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
  MarketCenter,
} from "@/lib/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createAndSendNotification } from "@/lib/utils/notifications";
import { ActivityUpdates } from "@/packages/transactional/emails/types";
import { toast } from "sonner";
import { useFetchAllUsers } from "@/hooks/use-users";
import { useIsEnterprise } from "@/hooks/useSubscription";
import { useStore } from "@/context/store-provider";
import { ToolTip } from "@/components/ui/tooltip/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

type CategoryOption = { label: string; ids: string[] };

export default function AdminTicketList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { role } = useUserRole();
  const { isEnterprise } = useIsEnterprise();
  const { currentUser } = useStore();

  const defaultSelectedMarketCenterId = useMemo(() => {
    if (isEnterprise) {
      return "all";
    } else {
      return currentUser?.marketCenterId || "all";
    }
  }, [isEnterprise, currentUser]);

  const defaultSelectedCategory: CategoryOption = useMemo(
    () => ({ label: "all", ids: [] }),
    []
  );
  const [viewDashboardHeader, setViewDashboardHeader] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [hasSavedFilters, setHasSavedFilters] = useState(false);

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
  const [selectedMarketCenterId, setSelectedMarketCenterId] = useState<string>(
    defaultSelectedMarketCenterId
  );

  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();

  const [openFrom, setOpenFrom] = useState(false);
  const [openTo, setOpenTo] = useState(false);

  const [sortBy, setSortBy] = useState<TicketSortBy>("updatedAt");
  const [filterOverdue, setFilterOverdue] = useState(false);
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

  // Load saved filters from localStorage on mount (only if user explicitly saved them)
  useEffect(() => {
    const filtersString = localStorage.getItem("ticket-filters-saved");
    if (filtersString) {
      try {
        const savedFilters = JSON.parse(filtersString);
        setSearchQuery(savedFilters.searchQuery || "");
        setSelectedStatuses(
          savedFilters.selectedStatuses || defaultActiveStatuses
        );
        setSelectedUrgencies(savedFilters.selectedUrgencies || []);
        setSelectedCategory(
          savedFilters.selectedCategory || defaultSelectedCategory
        );
        setSelectedAssignee(savedFilters.selectedAssignee || "all");
        setSelectedCreator(savedFilters.selectedCreator || "all");
        setSelectedMarketCenterId(savedFilters.selectedMarketCenterId || "all");
        setDateFrom(
          savedFilters.dateFrom ? new Date(savedFilters.dateFrom) : undefined
        );
        setDateTo(
          savedFilters.dateTo ? new Date(savedFilters.dateTo) : undefined
        );
        setOpenFrom(savedFilters.openFrom || false);
        setOpenTo(savedFilters.openTo || false);
        setSortBy(savedFilters.sortBy || "updatedAt");
        setSortDir(savedFilters.sortDir || "desc");
        setShowFilters(savedFilters.showFilters || false);
        setHasSavedFilters(true);
      } catch {
        // Invalid JSON, ignore saved filters
        localStorage.removeItem("ticket-filters-saved");
      }
    }
    setHydrated(true);
  }, [defaultSelectedCategory]);

  // Handle filter query param from dashboard navigation
  useEffect(() => {
    const filterParam = searchParams.get("filter");
    if (!filterParam || !hydrated) return;

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    switch (filterParam) {
      case "active":
        setSelectedStatuses(defaultActiveStatuses);
        setDateFrom(undefined);
        setDateTo(undefined);
        setFilterOverdue(false);
        break;
      case "new":
        setSelectedStatuses([...defaultActiveStatuses, "RESOLVED"]);
        setDateFrom(oneWeekAgo);
        setDateTo(now);
        setFilterOverdue(false);
        break;
      case "overdue":
        setSelectedStatuses(defaultActiveStatuses);
        setDateFrom(undefined);
        setDateTo(undefined);
        setFilterOverdue(true);
        break;
      case "resolved":
        setSelectedStatuses(["RESOLVED"]);
        setDateFrom(oneWeekAgo);
        setDateTo(now);
        setFilterOverdue(false);
        break;
    }

    setCurrentPage(1);
    // Clear the query param from URL without causing a navigation
    router.replace("/dashboard/tickets", { scroll: false });
  }, [searchParams, hydrated, router]);

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

  const displayedTickets: TicketWithUpdatedAt[] = useMemo(() => {
    if (!filterOverdue) return tickets;
    const now = new Date();
    return tickets.filter((ticket) => {
      if (ticket.status === "RESOLVED" || !ticket.dueDate) return false;
      const dueDate = new Date(ticket.dueDate);
      return dueDate < now;
    });
  }, [tickets, filterOverdue]);

  const totalTickets: number = useMemo(
    () => (filterOverdue ? displayedTickets.length : (ticketsData?.total ?? 0)),
    [filterOverdue, displayedTickets, ticketsData]
  );
  const totalPages = useMemo(
    () =>
      calculateTotalPages({
        totalItems: totalTickets,
        itemsPerPage,
      }),
    [totalTickets, itemsPerPage]
  );

  const {
    data: usersData,
    isLoading: usersLoading,
    refetch: refetchUsers,
  } = useFetchAllUsers({
    usersQueryKey: [
      "admin-users-ticket-list",
      { marketCenterId: selectedMarketCenterId },
    ],
    role: role,
  });

  const users: PrismaUser[] = useMemo(
    () => usersData?.users.sort(sortByRoleThenName) ?? [],
    [usersData]
  );

  const staffTeamMembers: PrismaUser[] = useMemo(() => {
    return users
      .filter((user) => user?.role && user.role !== "AGENT")
      .sort(sortByRoleThenName);
  }, [users]);

  const {
    data: marketCentersData,
    isLoading: marketCentersLoading,
    refetch: refetchMarketCenters,
  } = useFetchAllMarketCenters(role);

  const marketCenters: { name: string; id: string }[] = useMemo(() => {
    return marketCentersData?.marketCenters &&
      marketCentersData?.marketCenters.length > 0
      ? marketCentersData.marketCenters.map((mc: MarketCenter) => ({
          name: mc.name,
          id: mc.id,
        }))
      : [];
  }, [marketCentersData]);

  const {
    data: ticketCategoryData,
    isLoading: categoriesLoading,
    refetch: refetchCategories,
  } = useFetchMarketCenterCategories(selectedMarketCenterId);
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

  const adminTicketsQueryInvalidator = useCallback(
    () => queryClient.invalidateQueries({ queryKey: adminTicketsQueryKey }),
    [queryClient, adminTicketsQueryKey]
  );

  const refetchAllData = useCallback(async () => {
    await adminTicketsQueryInvalidator();
    await refetchMarketCenters();
    await refetchCategories();
    await refetchUsers();
  }, [
    adminTicketsQueryInvalidator,
    refetchMarketCenters,
    refetchCategories,
    refetchUsers,
  ]);

  const bulkAssignMutation = useMutation({
    mutationFn: async (payload: {
      ticketIds: string[];
      assigneeId: string;
    }) => {
      setIsLoading(true);
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
      await refetchAllData();
      setIsLoading(false);
    },
  });

  const bulkStatusMutation = useMutation({
    mutationFn: async (payload: {
      ticketIds: string[];
      status: TicketStatus;
    }) => {
      setIsLoading(true);

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
    },
    onSettled: async () => {
      await refetchAllData();
      setIsLoading(false);
    },
  });

  const handleSelectTicket = useCallback(
    (ticketId: string, checked: boolean) => {
      setSelectedTickets((prev) =>
        checked ? [...prev, ticketId] : prev.filter((id) => id !== ticketId)
      );
    },
    []
  );
  const handleSelectAll = useCallback(
    (checked: boolean) => {
      setSelectedTickets(checked ? displayedTickets.map((t) => t.id) : []);
    },
    [displayedTickets]
  );

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
                    userName: userToNotify?.name ?? "",
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
      await refetchAllData();
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
      ticket: Ticket & { previousAssignment: string | null };
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
          templateName: notifyAssigneeChanges
            ? "Ticket Assignment"
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
                    userName: userToNotify?.name ?? "",
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
                  currentAssignment: ticket?.assignee?.name || "Unassigned",
                  previousAssignment: ticket?.previousAssignment || null,
                  userName: userToNotify?.name ?? "",
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
          const assignmentChanges: UsersToNotify[] = data?.usersToNotify.map(
            (user: UsersToNotify) =>
              user.updateType === "added" || user.updateType === "removed"
          );

          let previousAssignment = null;

          if (assignmentChanges && assignmentChanges?.length > 0) {
            const removedUser: UsersToNotify = data?.usersToNotify.find(
              (user: UsersToNotify) => user.updateType === "removed"
            );

            if (removedUser && removedUser?.name) {
              previousAssignment = removedUser.name;
            } else if (!removedUser || !removedUser?.name) {
              previousAssignment = "Unassigned";
            }
          }

          await Promise.all(
            data.usersToNotify.map(async (user: UsersToNotify) =>
              handleSendTicketNotifications({
                ticket: { ...ticket, previousAssignment } as Ticket & {
                  previousAssignment: string | null;
                },
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
        await refetchAllData();
        setIsLoading(false);
      }
    },
    [refetchAllData, getToken, handleSendTicketNotifications]
  );

  const clearFilters = useCallback(() => {
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
    setFilterOverdue(false);
  }, [defaultSelectedCategory]);

  const saveFilters = useCallback(() => {
    localStorage.setItem(
      "ticket-filters-saved",
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
      })
    );
    setHasSavedFilters(true);
    toast.success("Filters saved");
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
    showFilters,
    openFrom,
    openTo,
    sortBy,
    sortDir,
  ]);

  const clearSavedFilters = useCallback(() => {
    localStorage.removeItem("ticket-filters-saved");
    setHasSavedFilters(false);
    clearFilters();
    toast.success("Saved filters cleared");
  }, [clearFilters]);

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
      sortBy !== "updatedAt" ||
      filterOverdue
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
    filterOverdue,
  ]);

  const handleQuickEdit = useCallback((e: React.MouseEvent, ticket: Ticket) => {
    e.stopPropagation();
    setEditingTicket(ticket);
    setIsEditOpen(true);
  }, []);
  const handleTicketClick = useCallback(
    (ticket: Ticket) => {
      queryClient.setQueryData(["ticket", ticket.id], { ticket });
      router.push(`/dashboard/tickets/${ticket.id}`);
    },
    [queryClient, router]
  );

  const stats = useMemo(() => {
    const resolvedTicketsCount = tickets.filter(
      (t: Ticket) => t.status === "RESOLVED"
    ).length;
    return {
      resolvedTicketsCount,
    };
  }, [tickets]);

  const findMarketCenterName = useCallback(
    (id: string | null, role?: string) => {
      if (role === "ADMIN") return "Global";
      if (!id) return "No Market Center";
      const mc = marketCenters && marketCenters.find((mc) => mc.id === id);
      return mc && mc?.name ? mc.name : `#${id.slice(0, 8)}`;
    },
    [marketCenters]
  );

  return (
    <>
      <Collapsible
        open={viewDashboardHeader}
        onOpenChange={setViewDashboardHeader}
      >
        <div className="flex flex-wrap gap-4 items-center justify-between mb-4">
          <div className="flex items-center gap-5">
            <h1 className="text-xl font-bold text-left w-full sm:w-fit">
              Tickets ({totalTickets})
            </h1>
            <CollapsibleTrigger asChild>
              <ToolTip
                content={
                  viewDashboardHeader
                    ? "Hide ticket search and filters"
                    : "Show ticket search and filters"
                }
                trigger={
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Toggle visibility for ticket search and filters"
                    onClick={() => setViewDashboardHeader(!viewDashboardHeader)}
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
          </div>

          <div className="flex flex-col-reverse w-full items-center gap-4 sm:flex-row sm:w-fit">
            {isEnterprise && (
              <TeamSwitcher
                selectedMarketCenterId={selectedMarketCenterId}
                setSelectedMarketCenterId={setSelectedMarketCenterId}
                handleMarketCenterSelected={() => {
                  setSelectedCategory(defaultSelectedCategory);
                  setCurrentPage(1);
                }}
              />
            )}
            <Button
              className="gap-2 w-full sm:w-fit"
              onClick={() => setIsCreateOpen(true)}
              size={"sm"}
            >
              <Plus className="h-4 w-4" />
              Create Ticket
            </Button>
          </div>
        </div>
        {/* FILTERS */}
        <CollapsibleContent>
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
                <>
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={saveFilters}
                    className="gap-2 w-full sm:w-fit"
                    type="button"
                  >
                    <Save className="h-4 w-4" />
                    Save Filters
                  </Button>
                </>
              )}
              {hasSavedFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSavedFilters}
                  className="gap-2 w-full sm:w-fit text-destructive hover:text-destructive"
                  type="button"
                >
                  <X className="h-4 w-4" />
                  Clear Saved
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
                      disabled={usersLoading || ticketsLoading}
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
                          {usersLoading ? "Loading..." : "All Staff"}
                        </SelectItem>
                        <SelectItem value="Unassigned">Unassigned</SelectItem>
                        {!usersLoading &&
                          staffTeamMembers.length > 0 &&
                          staffTeamMembers.map((user: PrismaUser) => {
                            return (
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
                                  {isEnterprise &&
                                    marketCenters &&
                                    marketCenters.length > 0 &&
                                    ` • ${findMarketCenterName(
                                      user?.marketCenterId,
                                      user?.role
                                    )}`}
                                </span>
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
                      disabled={usersLoading || ticketsLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select creator" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem
                          value="all"
                          className="flex items-center gap-2"
                        >
                          <Users className="h-4 w-4" />
                          {usersLoading ? "Loading..." : "All Team Members"}
                        </SelectItem>
                        {!usersLoading &&
                          users.map((user: PrismaUser) => {
                            return (
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
                                    : "No role"}{" "}
                                  {isEnterprise &&
                                    marketCenters &&
                                    marketCenters.length > 0 &&
                                    ` • ${findMarketCenterName(
                                      user?.marketCenterId,
                                      user?.role
                                    )}`}
                                </span>
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
                      disabled={ticketsLoading || categoriesLoading}
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

          <div className="flex flex-wrap justify-between items-center py-4 px-2 gap-4 w-full">
            <p className="text-sm text-muted-foreground">
              {selectedStatuses.includes("RESOLVED") &&
                `${stats?.resolvedTicketsCount ?? 0} resolved tickets`}
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
                  disabled={
                    ticketsLoading ||
                    !displayedTickets ||
                    !displayedTickets.length
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
              {/* ORDER BY */}
              <div className="space-y-2 w-full sm:w-fit">
                <Select
                  value={sortDir}
                  onValueChange={(value: OrderBy) => {
                    setSortDir(value);
                    setCurrentPage(1);
                  }}
                  disabled={
                    ticketsLoading ||
                    !displayedTickets ||
                    !displayedTickets.length
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
        </CollapsibleContent>
      </Collapsible>

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
                    selectedTickets.length === displayedTickets.length &&
                    displayedTickets.length > 0
                  }
                  onCheckedChange={(v: boolean | "indeterminate") =>
                    handleSelectAll(v === true)
                  }
                />
                Ticket
              </TableHead>
              <TableHead className="text-black">Assignee</TableHead>
              <TableHead
                className="text-black cursor-pointer text-center"
                onClick={() => {
                  setSortBy("status");
                  setSortDir(sortDir === "asc" ? "desc" : "asc");
                  setCurrentPage(1);
                }}
              >
                <p className="flex items-center justify-center gap-1">
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
                className="text-black cursor-pointer text-center"
                onClick={() => {
                  setSortBy("urgency");
                  setSortDir(sortDir === "asc" ? "desc" : "asc");
                  setCurrentPage(1);
                }}
              >
                <p className="flex items-center justify-center gap-1">
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
              <TableHead className="text-center text-black">Category</TableHead>
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
              displayedTickets.length > 0 &&
              displayedTickets.map((ticket: TicketWithUpdatedAt) => (
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
                  onReopen={() => handleReopenTicket(ticket)}
                />
              ))}

            {!ticketsLoading &&
              (!displayedTickets || !displayedTickets.length) && (
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
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {staffTeamMembers &&
                  staffTeamMembers.length > 0 &&
                  staffTeamMembers.map((user: PrismaUser) => (
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
        disabled={isLoading || ticketsLoading}
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
          await refetchAllData();
        }}
      />

      {/* Create Ticket Modal */}
      <CreateTicketForm
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={async (created) => {
          setIsCreateOpen(false);
          await refetchAllData();
        }}
      />
    </>
  );
}
