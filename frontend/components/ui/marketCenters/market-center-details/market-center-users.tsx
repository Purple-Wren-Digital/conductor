"use client";

import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useStore } from "@/context/store-provider";
import { useAuth } from "@clerk/nextjs";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PagesAndItemsCount from "@/components/ui/pagination/page-and-items-count";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import MarketCenterUserTable from "@/components/ui/tables/mc-user-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ToolTip } from "@/components/ui/tooltip/tooltip";
import { API_BASE } from "@/lib/api/utils";
import { useUserRole } from "@/hooks/use-user-role";
import { useFetchMarketCenterUsers } from "@/hooks/use-market-center";
import type {
  MarketCenterNotificationCallback,
  OrderBy,
  PrismaUser,
  UserRole,
  UserSortBy,
} from "@/lib/types";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowDownUp,
  ArrowUp,
  Filter,
  InfoIcon,
  Search,
  User,
  UsersIcon,
  X,
} from "lucide-react";
import {
  formatOrderBy,
  formatUserOptions,
  orderByOptions,
  ROLE_ICONS,
  roleOptions,
  sortByUserOptions,
  USER_STATUS_ICONS,
  userStatusOptions,
  UserStatusType,
} from "@/lib/utils";

export type MarketCenterAssignmentFilter = "Assigned" | "Unassigned";

export default function MarketCenterUsers({
  marketCenterId,
  marketCenterName,
  isLoading,
  setIsLoading,
  invalidateMarketCenter,
  handleSendMarketCenterNotifications,
}: {
  marketCenterId?: string;
  marketCenterName?: string;
  isLoading: boolean;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  invalidateMarketCenter: () => Promise<void>;
  handleSendMarketCenterNotifications: ({
    templateName,
    trigger,
    receivingUser,
    data,
  }: MarketCenterNotificationCallback) => Promise<void>;
}) {
  const router = useRouter();

  const [hydrated, setHydrated] = useState(false);

  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
  const [selectedRole, setSelectedRole] = useState<UserRole | "all">("all");
  const [selectedAssignment, setSelectedAssignment] =
    useState<MarketCenterAssignmentFilter>("Assigned");
  const [selectedUserStatus, setSelectedUserStatus] = useState<
    UserStatusType | "all"
  >("Active");

  const [sortBy, setSortBy] = useState<UserSortBy>("updatedAt");
  const [sortDir, setSortDir] = useState<OrderBy>("desc");

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const [showRemoveUserForm, setShowRemoveUserForm] = useState(false);
  const [userToRemove, setUserToRemove] = useState<PrismaUser | null>(null);

  const { currentUser } = useStore();
  const { permissions } = useUserRole();
  const { getToken } = useAuth();

  // FILTERS STATE PERSISTENCE
  useEffect(() => {
    if (!hydrated) return; // prevents overwrite on load
    localStorage.setItem(
      "market-center-user-filters",
      JSON.stringify({
        showFilters,
        searchQuery,
        selectedRole,
        selectedAssignment,
        selectedUserStatus,
        sortBy,
        sortDir,
        currentPage,
      })
    );
  }, [
    hydrated,
    showFilters,
    searchQuery,
    selectedRole,
    selectedAssignment,
    selectedUserStatus,
    sortBy,
    sortDir,
    currentPage,
  ]);

  useEffect(() => {
    const filtersString = localStorage.getItem("market-center-user-filters");
    if (filtersString) {
      const fetchedFilters = JSON.parse(filtersString);

      setShowFilters(fetchedFilters.showFilters || false);
      setSearchQuery(fetchedFilters.searchQuery || "");
      setSelectedRole(fetchedFilters.selectedRole || "all");
      setSelectedAssignment(fetchedFilters.selectedAssignment || "Assigned");
      setSelectedUserStatus(fetchedFilters.selectedUserStatus || "Active");
      setSortBy(fetchedFilters.sortBy || "updatedAt");
      setSortDir(fetchedFilters.sortDir || "desc");
      setCurrentPage(fetchedFilters.currentPage || 1);
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
    if (selectedRole !== "all") params.append("role", selectedRole);
    // Market Center Assignment
    if (marketCenterId && selectedAssignment === "Assigned") {
      params.append("marketCenterId", marketCenterId);
    }
    if (selectedAssignment === "Unassigned") {
      params.append("marketCenterId", "Unassigned");
    }
    // Active/Inactive
    if (selectedUserStatus === "Active" || selectedUserStatus === "all") {
      params.append("isActive", "true");
    }
    if (selectedUserStatus === "Inactive" || selectedUserStatus === "all") {
      params.append("isActive", "false");
    }

    params.append("sortBy", sortBy);
    params.append("sortDir", sortDir);
    params.append("limit", String(itemsPerPage));
    params.append("offset", String((currentPage - 1) * itemsPerPage));
    return params;
  }, [
    marketCenterId,
    debouncedSearchQuery,
    selectedRole,
    selectedAssignment,
    selectedUserStatus,
    sortBy,
    sortDir,
    currentPage,
    itemsPerPage,
  ]);

  const queryKeyParams = useMemo(
    () => Object.fromEntries(queryParams.entries()) as Record<string, string>,
    [queryParams]
  );
  const usersQueryKey = useMemo(
    () => ["get-market-center-users", marketCenterId, queryKeyParams],
    [marketCenterId, queryKeyParams]
  );

  const { data: usersData, isLoading: usersLoading } =
    useFetchMarketCenterUsers({
      queryKey: usersQueryKey,
      queryKeyParams: queryKeyParams,
      marketCenterId: marketCenterId,
    });

  const teamMembers: PrismaUser[] = useMemo(
    () => usersData?.users ?? [],
    [usersData]
  );
  const totalTeamMembers = useMemo(() => usersData?.total ?? 0, [usersData]);
  const totalPages = useMemo(
    () => Math.ceil(totalTeamMembers / itemsPerPage),
    [totalTeamMembers, itemsPerPage]
  );

  const hasActiveFilters = useMemo(() => {
    return (
      !!searchQuery ||
      selectedRole !== "all" ||
      selectedAssignment !== "Assigned" ||
      selectedUserStatus !== "Active" ||
      sortDir !== "desc" ||
      sortBy !== "updatedAt"
    );
  }, [
    searchQuery,
    selectedRole,
    selectedAssignment,
    selectedUserStatus,
    sortDir,
    sortBy,
  ]);

  const clearFilters = useCallback(() => {
    setCurrentPage(1);
    setSearchQuery("");
    setSelectedRole("all");
    setSelectedAssignment("Assigned");
    setSelectedUserStatus("Active");
    setSortDir("desc");
    setSortBy("updatedAt");
  }, []);

  const getRoleIcon = (role: string) => {
    const Icon = ROLE_ICONS[role as keyof typeof ROLE_ICONS] || User;
    return <Icon className="h-4 w-4" />;
  };

  // REMOVAL
  const openRemoveUserModal = (user: PrismaUser) => {
    setUserToRemove(user);
    setShowRemoveUserForm(true);
  };

  const removeUserMutation = useMutation({
    mutationFn: async (user: PrismaUser) => {
      if (!marketCenterId) throw new Error("Missing Market Center ID");

      const token = await getToken();
      if (!token) {
        throw new Error("Failed to get authentication token");
      }
      const response = await fetch(
        `${API_BASE}/marketCenters/users/${marketCenterId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            users: [user],
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to update market center");

      return user;
    },
    onSuccess: async (user: PrismaUser) => {
      toast.success(`${user?.name} was removed`);
      await handleSendMarketCenterNotifications({
        templateName: "Market Center Assignment",
        trigger: "Market Center Assignment",
        receivingUser: {
          id: user?.id,
          name: user?.name ?? "",
          email: user?.email,
        },
        data: {
          marketCenterAssignment: {
            userUpdate: "removed",
            marketCenterId: marketCenterId,
            marketCenterName: marketCenterName,
            userName: user?.name ?? user?.email,
            editorEmail: currentUser?.email ?? "",
            editorName: currentUser?.name ?? "",
          },
        },
      });
      setUserToRemove({} as PrismaUser);
      setShowRemoveUserForm(false);
    },
    onError: (error) => {
      console.error("Failed to remove user", error);
      toast.error("Failed to remove user");
    },
    onSettled: () => {
      invalidateMarketCenter();
      setIsLoading(false);
    },
  });

  const handleRemoveUser = async (user: PrismaUser | null) => {
    if (!user) throw new Error("User data is missing");
    setIsLoading(true);
    removeUserMutation.mutate(user);
  };

  const getUserStatusIcons = (status: UserStatusType | "all") => {
    const Icon =
      USER_STATUS_ICONS[status as keyof typeof USER_STATUS_ICONS] || UsersIcon;
    return <Icon className="h-4 w-4" />;
  };

  return (
    <>
      <Card className="lg:col-span-2">
        <CardHeader className="flex justify-between align-center">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <CardTitle>Team Members ({totalTeamMembers})</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div
            className={`space-y-4 transition-opacity duration-300
              ${isLoading ? "opacity-50 pointer-events-none" : "opacity-100"}`}
          >
            <div className="space-y-4 mt-4">
              {/* SEARCH USERS + FILTER BUTTON */}
              <div className="flex items-center gap-4">
                {/* SEARCH USERS */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    disabled={isLoading || usersLoading}
                  />
                </div>
                {/* FILTER BUTTON */}
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 bg-transparent w-full sm:w-fit"
                  onClick={() => setShowFilters(!showFilters)}
                  type="button"
                  disabled={isLoading || usersLoading}
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
                    disabled={isLoading || usersLoading}
                  >
                    <X className="h-4 w-4" />
                    Clear
                  </Button>
                )}
              </div>
            </div>
            {showFilters && (
              <Card className="p-4 bg-muted/50">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {/* ROLE */}
                  <div className="space-y-2">
                    <Label>Role</Label>

                    <Select
                      value={selectedRole}
                      onValueChange={(value: UserRole | "all") => {
                        setSelectedRole(value);
                        setCurrentPage(1);
                      }}
                      disabled={isLoading || usersLoading}
                      aria-label="Filter by Role"
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        {roleOptions.map((role) => (
                          <SelectItem key={role} value={role}>
                            <div className="flex items-center gap-2">
                              {getRoleIcon(role)}
                              {role.split("_").join(" ")}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* ASSIGNMENT */}
                  <div className="space-y-2">
                    <ToolTip
                      content={`"Assigned:" Users currently assigned to this Market Center | "Unassigned:" Users not assigned to any market center`}
                      trigger={
                        <div className="flex items-center gap-2 hover:cursor-pointer">
                          <Label>Assignment Status</Label>
                          <InfoIcon className="size-3 text-muted-foreground" />
                        </div>
                      }
                    />
                    <Select
                      value={selectedAssignment}
                      onValueChange={(value: MarketCenterAssignmentFilter) => {
                        setSelectedAssignment(value);
                        setCurrentPage(1);
                      }}
                      disabled={isLoading || usersLoading}
                      aria-label="Filter by Market Center Assignment Type: Assigned, Unassigned, or All"
                    >
                      <SelectTrigger className="gap-2">
                        <SelectValue
                          placeholder={"Filter by Assignment Type"}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Assigned">Assigned</SelectItem>
                        <SelectItem value="Unassigned">Unassigned</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* ACTIVE / INACTIVE */}
                  <div className="space-y-2">
                    <ToolTip
                      content={`"Active:" Users who can log in and access the system | "Inactive:" Deactivated and cannot log in`}
                      trigger={
                        <div className="flex items-center gap-2 hover:cursor-pointer">
                          <Label>User Status</Label>
                          <InfoIcon className="size-3 text-muted-foreground" />
                        </div>
                      }
                    />
                    <Select
                      value={selectedUserStatus}
                      onValueChange={(value: UserStatusType | "all") => {
                        setSelectedUserStatus(value);
                        setCurrentPage(1);
                      }}
                      disabled={isLoading || usersLoading}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={"all"}>All User Statuses</SelectItem>
                        {userStatusOptions.map((status) => (
                          <SelectItem key={status} value={status}>
                            <div className="flex items-center gap-2">
                              {getUserStatusIcons(status)}
                              {status} Users
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                      disabled={
                        usersLoading || !teamMembers || !teamMembers.length
                      }
                    >
                      <SelectTrigger aria-label="Sort by tickets created on date, updated on date, urgency or status">
                        <SelectValue placeholder={"Sort by..."} />
                      </SelectTrigger>

                      <SelectContent>
                        {sortByUserOptions.map((userOption) => (
                          <SelectItem key={userOption} value={userOption}>
                            <div className="flex gap-1 items-center mr-1">
                              <ArrowDownUp />
                              <p className="text-sm font-medium">
                                {formatUserOptions(userOption)}
                              </p>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* ORDER BY */}
                  <div className="space-y-2">
                    <Label>Order By</Label>
                    <Select
                      value={sortDir}
                      onValueChange={(value: OrderBy) => {
                        setSortDir(value);
                        setCurrentPage(1);
                      }}
                      disabled={
                        usersLoading || !teamMembers || !teamMembers.length
                      }
                    >
                      <SelectTrigger aria-label="Order by ascending or descending data">
                        <SelectValue placeholder={"Order by..."} />
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

            <Table>
              <TableHeader className="bg-muted">
                <TableRow className="border rounded">
                  <TableHead
                    className="text-black cursor-pointer"
                    onClick={() => {
                      setSortBy("name");
                      setSortDir(sortDir === "asc" ? "desc" : "asc");
                      setCurrentPage(1);
                    }}
                  >
                    <p className="flex items-center gap-1">
                      {sortBy === "name" && sortDir === "asc" ? (
                        <ArrowUp className="size-4" />
                      ) : sortBy === "name" && sortDir === "desc" ? (
                        <ArrowDown className="size-4" />
                      ) : (
                        <ArrowDownUp className="size-4" />
                      )}
                      Name
                    </p>
                  </TableHead>
                  <TableHead className="text-black">Email</TableHead>
                  <TableHead
                    className="text-black cursor-pointer"
                    onClick={() => {
                      setSortBy("role");
                      setSortDir(sortDir === "asc" ? "desc" : "asc");
                      setCurrentPage(1);
                    }}
                  >
                    <p className="flex items-center gap-1">
                      {sortBy === "role" && sortDir === "asc" ? (
                        <ArrowUp className="size-4" />
                      ) : sortBy === "role" && sortDir === "desc" ? (
                        <ArrowDown className="size-4" />
                      ) : (
                        <ArrowDownUp className="size-4" />
                      )}
                      Role
                    </p>
                  </TableHead>
                  <TableHead className="text-black">Category</TableHead>
                  <TableHead className="text-center text-black">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
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
                {teamMembers &&
                  teamMembers.length > 0 &&
                  teamMembers.map((member, index) => {
                    return (
                      <MarketCenterUserTable
                        key={member.id + index}
                        user={member}
                        onEdit={() =>
                          router.push(`/dashboard/users/${member.id}`)
                        }
                        onClick={() =>
                          router.push(`/dashboard/users/${member.id}`)
                        }
                        onDelete={() => openRemoveUserModal(member)}
                      />
                    );
                  })}
                {!isLoading && (!teamMembers || !teamMembers.length) && (
                  <TableRow className="text-center text-muted-foreground">
                    <TableCell colSpan={5} className="py-8">
                      No team members found. Contact Admin if you haven&apos;t
                      been assigned a team.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <PagesAndItemsCount
              type="users"
              totalItems={totalTeamMembers}
              itemsPerPage={itemsPerPage}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              totalPages={totalPages}
            />
          </div>
        </CardContent>
      </Card>

      {/* REMOVE TEAM MEMBER */}
      <AlertDialog
        open={showRemoveUserForm}
        onOpenChange={setShowRemoveUserForm}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{" "}
              <span className={"font-semibold"}>
                {userToRemove?.name ? userToRemove.name : "this person"}
              </span>{" "}
              from your team? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              disabled={isLoading}
              variant="outline"
              onClick={() => setShowRemoveUserForm(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleRemoveUser(userToRemove)}
              variant="destructive"
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={isLoading || !permissions?.canManageTeam}
            >
              Remove Member
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
