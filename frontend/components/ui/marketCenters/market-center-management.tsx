"use client";

import type React from "react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MarketCenterListItem } from "@/components/ui/list-item/market-center-list-item";
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
  Building,
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
  const [showFilters, setShowFilters] = useState(false);

  const [selectedMarketCenterId, setSelectedMarketCenterId] =
    useState<string>("all");

  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedUsers, setSelectedUsers] = useState<PrismaUser[]>([]);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(4);

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);

  const [sortBy, setSortBy] = useState<string>("updatedAt");
  const [orderDir, setOrderDir] = useState<OrderBy>("desc");

  const { getToken } = useAuth();

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
    if (selectedCategory !== "all") {
      params.append("categoryId", selectedCategory);
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
  const categories: TicketCategory[] = ticketCategoryData?.categories ?? [];

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedUsers([]);
    setSelectedCategory("all");
    setSelectedMarketCenterId("all");
    setCurrentPage(1);
    setSortBy("updatedAt");
    setOrderDir("desc");
  };

  const hasActiveFilters =
    !!searchQuery ||
    selectedCategory !== "all" ||
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
      <Card>
        <CardHeader>
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
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

          <div className="space-y-4 mt-4">
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
                        setSelectedCategory("all");
                        setSelectedUsers(marketCenter?.users ?? []);
                        setCurrentPage(1);
                      }}
                    />
                  </div>

                  {/* CATEGORIES */}
                  <div className="space-y-2">
                    <Label>Categories</Label>
                    <Select
                      value={selectedCategory}
                      onValueChange={(value) => {
                        setSelectedCategory(value);
                        setCurrentPage(1);
                      }}
                      disabled={!selectedMarketCenterId}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">
                          All Categories ({categories.length ?? 0})
                        </SelectItem>
                        {categories &&
                          categories.length > 0 &&
                          categories.map((category: TicketCategory) => {
                            return (
                              <SelectItem
                                key={category?.id}
                                value={category?.id}
                              >
                                {category?.name}
                              </SelectItem>
                            );
                          })}
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
                              {direction === "desc" ? (
                                <ArrowDown />
                              ) : (
                                <ArrowUp />
                              )}
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
        </CardHeader>

        <CardContent>
          <div
            className={`space-y-4 transition-opacity duration-300 ${marketCentersLoading ? "opacity-50 pointer-events-none" : "opacity-100"}`}
          >
            {marketCentersLoading &&
              (!marketCenters || !marketCenters.length) && (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-16 bg-muted rounded" />
                    </div>
                  ))}
                </div>
              )}
            {!marketCentersLoading &&
              marketCenters &&
              marketCenters.length > 0 &&
              marketCenters.map((mc) => (
                <MarketCenterListItem
                  key={mc.id}
                  marketCenter={mc}
                  onEdit={() => openEditModal(mc)}
                  onClose={() => openDeleteModal(mc)}
                  onClick={() => {
                    router.push(`/dashboard/marketCenters/${mc.id}?tab=team`);
                  }}
                  selectable={false}
                />
              ))}

            {!marketCentersLoading &&
              (!marketCenters || !marketCenters.length) && (
                <div className="text-center py-8 text-muted-foreground">
                  No market centers found matching criteria
                </div>
              )}

            <PagesAndItemsCount
              type={"market centers"}
              totalItems={totalMarketCenters}
              itemsPerPage={itemsPerPage}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              totalPages={totalPages}
            />
          </div>
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
