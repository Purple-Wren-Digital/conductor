"use client";

import type React from "react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import CreateMarketCenter from "@/components/ui/marketCenters/market-center-create-form";
import DeleteMarketCenter from "@/components/ui/marketCenters/market-center-delete-form";
import EditMarketCenter from "@/components/ui/marketCenters/market-center-edit-form";
import PagesAndItemsCount from "@/components/ui/pagination/page-and-items-count";
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
import { TeamSwitcher } from "@/components/ui/team-switcher";
import { API_BASE } from "@/lib/api/utils";
import type {
  MarketCenter,
  MarketCenterForm,
  MarketCenterNotificationCallback,
  OrderBy,
  PrismaUser,
  TicketCategory,
  UserSortBy,
  UsersResponse,
} from "@/lib/types";
import { useUserRole } from "@/hooks/use-user-role";
import {
  ArrowDown,
  ArrowDownUp,
  ArrowUp,
  Filter,
  Plus,
  Search,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useFetchMarketCenterCategories,
  useSearchMarketCenters,
} from "@/hooks/use-market-center";
import {
  useQuery,
  useQueryClient,
  UseQueryResult,
} from "@tanstack/react-query";
import {
  calculateTotalPages,
  formatOrderBy,
  formatUserOptions,
  orderByOptions,
  sortByUserOptions,
} from "@/lib/utils";
import UserMultiSelectDropdown from "@/components/ui/multi-select/user-multi-select-dropdown";
import { createAndSendNotification } from "@/lib/utils/notifications";
import MarketCentersTable from "../tables/market-centers-table";

type CategoryOption = { label: string; ids: string[] };
const defaultSelectedCategory: CategoryOption = { label: "all", ids: [] };

export default function MarketCenterManagement() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user: clerkUser } = useUser();

  const { role } = useUserRole();

  // FORM ACTIONS
  const [showCreateMCForm, setShowCreateMCForm] = useState(false);

  const [showEditMCForm, setShowEditMCForm] = useState(false);
  const [editingMarketCenter, setEditingMarketCenter] =
    useState<MarketCenter | null>(null);
  const [assignedUsers, setAssignedUsers] = useState<PrismaUser[]>([]);

  const [formData, setFormData] = useState<MarketCenterForm>({
    name: "",
    selectedUsers: [],
  });

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [marketCenterToDelete, setMarketCenterToDelete] =
    useState<MarketCenter | null>(null);

  // MANAGEMENT SEARCH
  const [hydrated, setHydrated] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const [selectedMarketCenterId, setSelectedMarketCenterId] =
    useState<string>("all");

  const [selectedCategory, setSelectedCategory] = useState<CategoryOption>(
    defaultSelectedCategory
  );
  const [selectedUsers, setSelectedUsers] = useState<PrismaUser[]>([]);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(4);

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);

  const [sortBy, setSortBy] = useState<string>("updatedAt");
  const [orderDir, setOrderDir] = useState<OrderBy>("desc");

  const { getToken } = useAuth();

  // FILTERS STATE PERSISTENCE
  useEffect(() => {
    if (!hydrated) return; // prevents overwrite on load
    localStorage.setItem(
      "market-center-filters",
      JSON.stringify({
        selectedMarketCenterId,
        selectedCategory,
        selectedUsers,
        searchQuery,
        sortBy,
        orderDir,
        currentPage,
        showFilters,
      })
    );
  }, [
    hydrated,
    searchQuery,
    selectedMarketCenterId,
    selectedCategory,
    selectedUsers,
    sortBy,
    orderDir,
    currentPage,
    showFilters,
  ]);
  useEffect(() => {
    const filtersString = localStorage.getItem("market-center-filters");
    if (filtersString) {
      const fetchedFilters = JSON.parse(filtersString);

      setSearchQuery(fetchedFilters.searchQuery || "");
      setSelectedCategory(
        fetchedFilters.selectedCategory || { name: "all", ids: [] }
      );
      setSelectedMarketCenterId(fetchedFilters.selectedMarketCenterId || "all");
      setSelectedUsers(fetchedFilters.selectedUsers || []);

      setSortBy(fetchedFilters.sortBy || "updatedAt");
      setOrderDir(fetchedFilters.orderDir || "desc");
      setCurrentPage(fetchedFilters.currentPage || 1);
      setShowFilters(fetchedFilters.showFilters || false);
    }

    setHydrated(true);
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setCurrentPage(1);
    }, 500);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (debouncedSearchQuery) params.append("query", debouncedSearchQuery);
    if (
      selectedCategory &&
      selectedCategory?.label !== "all" &&
      selectedCategory?.ids &&
      selectedCategory?.ids.length > 0
    ) {
      selectedCategory.ids.forEach((categoryId) =>
        params.append("categoryIds", categoryId)
      );
    }
    if (selectedUsers && selectedUsers.length > 0) {
      selectedUsers.forEach((user) => params.append("userIds", user.id));
    }
    if (selectedMarketCenterId !== "all")
      params.append("id", selectedMarketCenterId);
    params.append("sortBy", sortBy);
    params.append("sortDir", orderDir);
    params.append("limit", String(itemsPerPage));
    params.append("offset", String((currentPage - 1) * itemsPerPage));
    return params;
  }, [
    debouncedSearchQuery,
    selectedCategory,
    selectedUsers,
    selectedMarketCenterId,
    sortBy,
    orderDir,
    currentPage,
    itemsPerPage,
  ]);

  const queryKeyParams = useMemo(
    () => Object.fromEntries(queryParams.entries()) as Record<string, string>,
    [queryParams]
  );
  const marketCentersQueryKey = useMemo(
    () => ["market-center-search", queryKeyParams] as const,
    [queryKeyParams]
  );

  const { data: marketCentersData, isLoading: marketCentersLoading } =
    useSearchMarketCenters({
      role: role,
      queryParams: queryParams,
      marketCentersQueryKey: marketCentersQueryKey,
    });

  const marketCenters: MarketCenter[] = marketCentersData?.marketCenters ?? [];
  const totalMarketCenters: number = marketCentersData?.total ?? 0;
  const totalPages = calculateTotalPages({
    totalItems: totalMarketCenters,
    itemsPerPage,
  });

  const invalidateMarketCenters = queryClient.invalidateQueries({
    queryKey: marketCentersQueryKey,
  });

  const { data: usersData }: UseQueryResult<UsersResponse, Error> = useQuery<
    UsersResponse,
    Error,
    UsersResponse
  >({
    queryKey: ["market-center-filter-users"],
    queryFn: async (): Promise<UsersResponse> => {
      const token = await getToken();
      if (!token) {
        throw new Error("Failed to get authentication token");
      }
      const response = await fetch(`${API_BASE}/users`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(
          response?.statusText
            ? response.statusText
            : "Failed to fetch all users"
        );
      }
      const data = await response.json();
      return data;
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!clerkUser,
  });

  const users: PrismaUser[] = usersData?.users ?? [];
  const unassignedUsers: PrismaUser[] = users.filter((user) => {
    if (!user?.marketCenterId) return user;
  });

  const invalidateUsers = queryClient.invalidateQueries({
    queryKey: ["market-center-filter-users"],
  });

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

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedUsers([]);
    setSelectedCategory(defaultSelectedCategory);
    setSelectedMarketCenterId("all");
    setCurrentPage(1);
    setSortBy("updatedAt");
    setOrderDir("desc");
  };

  const hasActiveFilters =
    !!searchQuery ||
    (selectedCategory.label !== "all" &&
      selectedCategory?.ids &&
      selectedCategory.ids.length > 0) ||
    selectedMarketCenterId !== "all" ||
    (selectedUsers && selectedUsers?.length > 0) ||
    orderDir !== "desc" ||
    sortBy !== "updatedAt";

  const openCreateModal = () => {
    setEditingMarketCenter(null);
    setMarketCenterToDelete(null);
    setFormData({
      name: "",
      selectedUsers: [],
    });
    setAssignedUsers([]);
    setShowCreateMCForm(true);
  };

  const openEditModal = (marketCenter: MarketCenter) => {
    setEditingMarketCenter(marketCenter);
    setMarketCenterToDelete(null);
    setFormData({
      name: marketCenter.name,
      selectedUsers:
        marketCenter?.users && marketCenter?.users.length
          ? marketCenter.users
          : [],
    });
    setAssignedUsers(
      marketCenter?.users && marketCenter?.users.length
        ? marketCenter.users
        : []
    );
    setShowEditMCForm(true);
  };

  const openDeleteModal = (marketCenter: MarketCenter) => {
    setEditingMarketCenter(null);
    setMarketCenterToDelete(marketCenter);
    setShowDeleteModal(true);
  };

  const handleSendMarketCenterNotifications = useCallback(
    async ({
      templateName,
      trigger,
      receivingUser,
      data,
    }: MarketCenterNotificationCallback) => {
      try {
        const response = await createAndSendNotification({
          getToken: getToken,
          templateName: templateName,
          trigger: trigger,
          receivingUser: receivingUser,
          data: data,
        });
      } catch (error) {
        console.error(
          "MarketCenterManagement - Unable to generate notifications",
          error
        );
      }
    },
    [getToken]
  );

  return (
    <div className="space-y-6">
      <section>
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div>
            <CardTitle className="text-2xl flex items-center gap-2">
              Market Center Management ({totalMarketCenters})
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Create and manage all market centers
            </p>
          </div>
          <Button
            onClick={() => openCreateModal()}
            className="gap-2 w-full sm:w-fit"
          >
            <Plus className="h-4 w-4" />
            Add Market Center
          </Button>
        </div>
        <div className="space-y-4 my-4">
          {/* SEARCH USERS + FILTER BUTTON */}
          <div className="flex flex-col w-full items-center gap-4 sm:flex-row sm:w-none">
            {/* SEARCH USERS */}
            <div className="relative flex-1 w-full sm:w-fit">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search market centers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                disabled={
                  marketCentersLoading ||
                  !marketCenters ||
                  !marketCenters.length
                }
              />
            </div>
            {/* FILTER BUTTON */}
            <Button
              variant="outline"
              size="sm"
              className="gap-2 bg-transparent w-full sm:w-fit"
              onClick={() => setShowFilters(!showFilters)}
              type="button"
              disabled={marketCentersLoading}
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
                {/* MARKET CENTER */}
                <div className="space-y-2">
                  <Label>Market Centers</Label>
                  <TeamSwitcher
                    selectedMarketCenterId={selectedMarketCenterId}
                    setSelectedMarketCenterId={setSelectedMarketCenterId}
                    handleMarketCenterSelected={(
                      marketCenter?: MarketCenter
                    ) => {
                      setSelectedCategory(defaultSelectedCategory);
                      setSelectedUsers(marketCenter?.users ?? []);
                      setCurrentPage(1);
                    }}
                  />
                </div>

                {/* CATEGORIES */}
                <div className="space-y-2">
                  <Label>Categories</Label>
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

                {/* ASSIGNED USERS */}
                <div className="space-y-2 row-span-2">
                  <Label>Users</Label>
                  <UserMultiSelectDropdown
                    type="search"
                    filter={selectedMarketCenterId !== "all"}
                    disabled={false}
                    marketCenterId={selectedMarketCenterId}
                    placeholder={
                      selectedUsers && selectedUsers.length > 0
                        ? `${selectedUsers.length ?? 0} users selected`
                        : `All Users (${users?.length ?? 0})`
                    }
                    formFieldName={"Users"}
                    options={users}
                    selectedOptions={selectedUsers}
                    handleSetSelectedOptions={(newSelected: PrismaUser[]) => {
                      setSelectedUsers(newSelected);
                    }}
                    error={null}
                  />
                  <div className="space-y-2 space-x-2 w-full">
                    {selectedUsers &&
                      selectedUsers.length > 0 &&
                      selectedUsers.map((selectedUser, index) => {
                        return (
                          <Badge key={index} variant="default">
                            <p className="text-md">{selectedUser.name}</p>
                          </Badge>
                        );
                      })}
                  </div>
                </div>

                {/* SORT BY */}
                <div className="space-y-2">
                  <Label>Sort By</Label>

                  <Select
                    value={sortBy}
                    onValueChange={(value: UserSortBy) => {
                      setSortBy(value);
                      setCurrentPage(1);
                    }}
                    disabled={!marketCenters || !marketCenters.length}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={"Sort By"} />
                    </SelectTrigger>

                    <SelectContent>
                      {sortByUserOptions.map((userOption: UserSortBy) => {
                        if (userOption === "name") return null;
                        return (
                          <SelectItem key={userOption} value={userOption}>
                            <div className="flex gap-1 items-center mr-1">
                              <ArrowDownUp />
                              <p className="text-sm font-medium">
                                {formatUserOptions(userOption)}
                              </p>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                {/* ORDER BY */}
                <div className="space-y-2">
                  <Label>Order By</Label>

                  <Select
                    value={orderDir}
                    onValueChange={(value: OrderBy) => {
                      setOrderDir(value);
                      setCurrentPage(1);
                    }}
                    disabled={!marketCenters || !marketCenters.length}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={"Order by"} />
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
            </Card>
          )}
        </div>
      </section>

      <Card>
        <CardContent
          className={`space-y-4 transition-opacity duration-300 ${marketCentersLoading ? "opacity-50 pointer-events-none" : "opacity-100"}`}
        >
          <Table>
            <TableHeader className="bg-muted">
              <TableRow className="border rounded">
                <TableHead className="text-black">Market Center</TableHead>
                <TableHead className="text-black text-center">
                  Avg Rating
                </TableHead>
                <TableHead className="text-black text-center">
                  Tickets
                </TableHead>
                <TableHead className="text-black text-center">
                  Team Members
                </TableHead>
                <TableHead className="text-black text-center">
                  Categories
                </TableHead>
                <TableHead className="text-center text-black">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {marketCentersLoading && (
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
              {!marketCentersLoading &&
                marketCenters &&
                marketCenters.length > 0 && (
                  <>
                    {marketCenters.map((mc) => (
                      <MarketCentersTable
                        key={mc.id}
                        marketCenter={mc}
                        onEdit={() => openEditModal(mc)}
                        onDelete={() => openDeleteModal(mc)}
                        onClick={() => {
                          router.push(
                            `/dashboard/marketCenters/${mc.id}?tab=team`
                          );
                        }}
                      />
                    ))}
                  </>
                )}
              {!marketCentersLoading &&
                (!marketCenters || !marketCenters.length) && (
                  <TableRow className="text-center text-muted-foreground">
                    <TableCell colSpan={5} className="py-8">
                      No market centers found
                    </TableCell>
                  </TableRow>
                )}
            </TableBody>
          </Table>

          <PagesAndItemsCount
            type={"market centers"}
            totalItems={totalMarketCenters}
            itemsPerPage={itemsPerPage}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            totalPages={totalPages}
          />
        </CardContent>
      </Card>

      {/* CREATE MARKET CENTER */}
      <CreateMarketCenter
        showCreateMCForm={showCreateMCForm}
        setShowCreateMCForm={setShowCreateMCForm}
        formData={formData}
        setFormData={setFormData}
        refreshMarketCenters={invalidateMarketCenters}
        refreshUsers={invalidateUsers}
        unassignedUsers={unassignedUsers}
        handleSendMarketCenterNotifications={
          handleSendMarketCenterNotifications
        }
      />

      {/* EDIT MARKET CENTER */}
      <EditMarketCenter
        editingMarketCenter={editingMarketCenter}
        setEditingMarketCenter={setEditingMarketCenter}
        showEditMCForm={showEditMCForm}
        setShowEditMCForm={setShowEditMCForm}
        formData={formData}
        setFormData={setFormData}
        assignedUsers={assignedUsers}
        unassignedUsers={unassignedUsers}
        refreshMarketCenters={invalidateMarketCenters}
        refreshUsers={invalidateUsers}
      />

      {/* DELETE MARKET CENTER */}
      <DeleteMarketCenter
        marketCenterToDelete={marketCenterToDelete}
        setMarketCenterToDelete={setMarketCenterToDelete}
        showDeleteModal={showDeleteModal}
        setShowDeleteModal={setShowDeleteModal}
        refreshMarketCenters={invalidateMarketCenters}
        refreshUsers={invalidateUsers}
        handleSendMarketCenterNotifications={
          handleSendMarketCenterNotifications
        }
      />
    </div>
  );
}
