"use client";

import { Dispatch, SetStateAction, useEffect, useMemo, useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
// import { UserListItem } from "@/components/ui/list-item/user-list-item";
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
import { ArrowDown, ArrowDownUp, ArrowUp, Search, User, X } from "lucide-react";
import {
  formatOrderBy,
  formatUserOptions,
  orderByOptions,
  ROLE_ICONS,
  roleOptions,
  sortByUserOptions,
} from "@/lib/utils";

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
  invalidateMarketCenter: () => void;
  handleSendMarketCenterNotifications: ({
    templateName,
    trigger,
    receivingUser,
    data,
  }: MarketCenterNotificationCallback) => Promise<void>;
}) {
  const router = useRouter();

  const [hydrated, setHydrated] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
  const [selectedRole, setSelectedRole] = useState<UserRole | "all">("all");
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
        searchQuery,
        selectedRole,
        sortBy,
        sortDir,
        currentPage,
      })
    );
  }, [hydrated, searchQuery, selectedRole, sortBy, sortDir, currentPage]);

  useEffect(() => {
    const filtersString = localStorage.getItem("market-center-user-filters");
    if (filtersString) {
      const fetchedFilters = JSON.parse(filtersString);

      setSearchQuery(fetchedFilters.searchQuery || "");
      setSelectedRole(fetchedFilters.selectedRole || "all");

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

    params.append("sortBy", sortBy);
    params.append("sortDir", sortDir);
    params.append("limit", String(itemsPerPage));
    params.append("offset", String((currentPage - 1) * itemsPerPage));
    return params;
  }, [
    debouncedSearchQuery,
    selectedRole,
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

  const teamMembers: PrismaUser[] = usersData?.users ?? [];
  const totalTeamMembers = usersData?.total ?? 0;
  const totalPages = Math.ceil(totalTeamMembers / itemsPerPage);

  const hasActiveFilters =
    !!searchQuery ||
    selectedRole !== "all" ||
    sortDir !== "desc" ||
    sortBy !== "updatedAt";

  const clearFilters = () => {
    setCurrentPage(1);
    setSearchQuery("");
    setSelectedRole("all");
    setSortDir("desc");
    setSortBy("updatedAt");
  };

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
        templateName: "Market Center User Removed",
        trigger: "Market Center Assignment",
        receivingUser: {
          id: user?.id,
          name: user?.name ?? "You",
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

  return (
    <>
      <Card className="lg:col-span-2">
        <CardHeader className="flex justify-between align-center">
          {/* <div className="flex flex-row space-x-2 items-center justify-between"> */}
          <CardTitle>Team Members ({totalTeamMembers})</CardTitle>
          {/* </div> */}
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
                  disabled={usersLoading || !teamMembers || !teamMembers.length}
                />
              </div>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="gap-2"
                  type="button"
                  disabled={usersLoading}
                >
                  <X className="h-4 w-4" />
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div
            className={`space-y-4 transition-opacity duration-300
              ${isLoading ? "opacity-50 pointer-events-none" : "opacity-100"}`}
          >
            <div className="flex flex-wrap justify-between items-center pb-2 py-2 gap-4 w-full">
              {/* FILTER BY ROLE */}
              <div className="space-y-2 w-full sm:w-[150px]">
                <Select
                  value={selectedRole}
                  onValueChange={(value: UserRole | "all") => {
                    setSelectedRole(value);
                    setCurrentPage(1);
                  }}
                  disabled={!teamMembers || !teamMembers.length}
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
              {/* SORT BY + ORDER BY */}
              <div className="flex flex-wrap items-center space-x-2 gap-4 w-full sm:w-fit">
                {/* SORT BY */}
                <div className="space-y-2 w-full sm:w-[150px]">
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
                <div className="space-y-2 w-full sm:w-[150px]">
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
