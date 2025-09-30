"use client";

import type React from "react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useStore } from "@/app/store-provider";
import type { OrderBy, UserRole, UserSortBy, UserWithStats } from "@/lib/types";
import { getAccessToken } from "@auth0/nextjs-auth0";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog/base-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserListItem } from "@/components/ui/list-item/user-list-item";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import CreateUser from "./create-user-form";
import { useFetchAllUsers } from "@/hooks/use-users";
import { useUserRole } from "@/lib/hooks/use-user-role";
import {
  userStatusOptions,
  UserStatusType,
  formatUserOptions,
  ROLE_ICONS,
  roleOptions,
  sortByUserOptions,
  orderByOptions,
  USER_STATUS_ICONS,
  formatOrderBy,
} from "@/lib/utils";
import {
  ArrowDownUp,
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
  User,
  UsersIcon,
  Users,
  UserPlus,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { TeamSwitcher } from "../team-switcher";

interface UserEditFormData {
  name: string;
  email: string;
  role: UserRole;
}

export default function UserManagement() {
  const queryClient = useQueryClient();

  const { role, permissions } = useUserRole();

  const { currentUser } = useStore();

  const marketCenterId = currentUser?.marketCenterId
    ? currentUser.marketCenterId
    : "null";

  const defaultMarketCenterId = role === "STAFF" ? marketCenterId : "all";

  const [showFilters, setShowFilters] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);

  const [selectedMarketCenterId, setSelectedMarketCenterId] = useState<
    string | "all"
  >(defaultMarketCenterId);
  const [selectedRole, setSelectedRole] = useState<UserRole | "all">("all");
  const [selectedUserStatus, setSelectedUserStatus] = useState<
    UserStatusType | "all"
  >("Active");

  const [sortBy, setSortBy] = useState<UserSortBy>("updatedAt");
  const [orderDir, setOrderDir] = useState<OrderBy>("asc");

  const [showCreateUserForm, setShowCreateUserForm] = useState(false);
  const [showEditUserForm, setShowEditUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithStats | null>(null);
  const [editUserFormData, setEditUserFormData] = useState<UserEditFormData>({
    name: "",
    email: "",
    role: "AGENT",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserWithStats | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const getAuth0AccessToken = useCallback(async () => {
    if (process.env.NODE_ENV === "development") return "local";
    return await getAccessToken();
  }, []);

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (debouncedSearchQuery) params.append("query", debouncedSearchQuery);
    if (selectedRole !== "all") params.append("role", selectedRole);
    if (selectedUserStatus !== "all" && selectedUserStatus === "Active") {
      params.append("isActive", "true");
    }
    if (selectedUserStatus !== "all" && selectedUserStatus === "Inactive") {
      params.append("isActive", "false");
    }

    if (role === "ADMIN" && selectedMarketCenterId !== "all")
      params.append("marketCenterId", selectedMarketCenterId);
    if (
      role === "STAFF" &&
      selectedMarketCenterId !== "all" &&
      currentUser?.marketCenterId
    )
      params.append("marketCenterId", currentUser?.marketCenterId);

    if (
      selectedMarketCenterId !== "all" &&
      role === "STAFF" &&
      currentUser?.marketCenterId
    ) {
      params.append("marketCenterId", currentUser?.marketCenterId);
    }
    params.append("sortDir", orderDir);
    params.append("limit", String(itemsPerPage));
    params.append("offset", String((currentPage - 1) * itemsPerPage));
    return params;
  }, [
    debouncedSearchQuery,
    selectedRole,
    selectedUserStatus,
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
  const usersQueryKey = useMemo(
    () => ["users", queryKeyParams] as const,
    [queryKeyParams]
  );

  const { data: usersData, isLoading: usersLoading } = useFetchAllUsers({
    usersQueryKey,
    queryParams,
    role,
  });

  const userQueryInvalidator = () =>
    queryClient.invalidateQueries({ queryKey: ["users"] });

  const allUsers: UserWithStats[] = usersData?.users ?? [];
  const totalUsers: number = usersData?.total ?? 0;
  const totalPages = Math.ceil(totalUsers / itemsPerPage);

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedRole("all");
    setSelectedMarketCenterId("all");
    setCurrentPage(1);
    setSortBy("updatedAt");
    setOrderDir("asc");
  };

  const hasActiveFilters =
    !!searchQuery ||
    selectedRole !== "all" ||
    selectedMarketCenterId !== "all" ||
    orderDir !== "asc" ||
    sortBy !== "updatedAt";

  // DELETE MODAL ACTIONS
  const handleEditUser = (user: UserWithStats) => {
    setEditingUser(user);
    setEditUserFormData({
      name: user.name,
      email: user.email,
      role: user.role,
    });
    setFormErrors({});
    setShowEditUserForm(true);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!editUserFormData.name.trim()) errors.name = "Name is required";
    if (!editUserFormData.email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editUserFormData.email)) {
      errors.email = "Invalid email format";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const resetEditUserFormAndClose = () => {
    setShowEditUserForm(false);
    setEditingUser(null);
    setFormErrors({});
    setEditUserFormData({
      name: "",
      email: "",
      role: "AGENT",
      // marketCenterId: ""
    });
    setEditingUser(null);
  };

  const updateUserMutation = useMutation({
    mutationFn: async (userId?: string) => {
      if (!userId) throw new Error("Missing editing user ID");

      const accessToken = await getAuth0AccessToken();
      const response = await fetch(`/api/users/${userId}/update`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(editUserFormData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to update user`);
      }
    },
    onSuccess: () => {
      toast.success(`${userToDelete?.name || "User"} was updated`);
      setShowEditUserForm(false);
      resetEditUserFormAndClose();
      userQueryInvalidator;
    },
    onError: (error) => {
      console.error("Failed to update user", error);
      toast.error("Failed to update user");
    },
  });

  const handleSubmitEditUserForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!permissions?.canManageAllUsers) {
      toast.error("You do not have permission to update users");
      return;
    }
    if (!validateForm()) return;
    setIsSubmitting(true);

    updateUserMutation.mutate(editingUser?.id);
    setIsSubmitting(false);
  };

  // DELETE MODAL ACTIONS
  const openDeleteModal = (user: UserWithStats) => {
    setUserToDelete(user);
    setConfirmOpen(true);
  };

  const deactivateUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      if (
        !permissions?.canDeactivateUsers ||
        !userToDelete ||
        !userToDelete?.id
      )
        return;

      const accessToken = await getAuth0AccessToken();
      const res = await fetch(`/api/users/${userToDelete.id}/update`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
        body: JSON.stringify({ isActive: false }),
      });
      if (!res.ok) throw new Error("Failed to deactivate user");
      return res.json();
    },
    onSuccess: () => {
      toast.success(`${userToDelete?.name || "User"} was removed`);
      setConfirmOpen(false);
      setUserToDelete(null);
      userQueryInvalidator;
    },
    onError: (error) => {
      console.error("Failed to deactivate user", error);
      toast.error("Failed to deactivate user");
    },
  });

  // const deleteUserMutation = useMutation({
  //   mutationFn: async (userId: string) => {
  //     if (
  //       !permissions?.canDeactivateUsers ||
  //       !userToDelete ||
  //       !userToDelete?.id
  //     )
  //       return;
  //     const accessToken = await getAuth0AccessToken();
  //     const response = await fetch(`/api/users/${userToDelete.id}`, {
  //       method: "DELETE",
  //       headers: { Authorization: `Bearer ${accessToken}` },
  //       body: JSON.stringify({ id: userToDelete.id }),
  //     });
  //     if (!response.ok) {
  //       throw new Error("Failed to delete user");
  //     }
  //     const data = await response.json();
  //     if (!data) {
  //       throw new Error("Failed to delete user");
  //     }
  //   },
  //   onSuccess: () => {
  //     toast.success(`${userToDelete?.name || "User"} was removed`);
  //     setConfirmOpen(false);
  //     setUserToDelete(null);
  //     userQueryInvalidator;
  //   },
  //   onError: (error) => {
  //     console.error("Failed to delete user", error);
  //     toast.error("Failed to delete user");
  //   },
  // });

  const confirmDelete = async (type: "delete" | "deactivate") => {
    if (
      !permissions?.canDeactivateUsers ||
      !userToDelete ||
      !userToDelete?.id
    ) {
      toast.error(`Unable to ${type} user`);
      return;
    }
    setDeleting(true);
    // if (type === "delete") deleteUserMutation.mutate(userToDelete?.id);
    if (type === "deactivate") deactivateUserMutation.mutate(userToDelete?.id);
    setDeleting(false);
  };

  const getRoleIcon = (role: string) => {
    const Icon = ROLE_ICONS[role as keyof typeof ROLE_ICONS] || User;
    return <Icon className="h-4 w-4" />;
  };

  const getUserStatusIcons = (status: UserStatusType | "all") => {
    const Icon =
      USER_STATUS_ICONS[status as keyof typeof USER_STATUS_ICONS] || UsersIcon;
    return <Icon className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Users ({totalUsers})
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Manage active users, roles, and permissions
              </p>
            </div>
            <Button
              onClick={() => {
                setEditingUser(null);
                setShowCreateUserForm(true);
              }}
              className="gap-2"
              disabled={!permissions?.canCreateUsers}
            >
              <UserPlus className="h-4 w-4" />
              Create New User
            </Button>
          </div>

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
                  disabled={usersLoading || !allUsers || !allUsers.length}
                />
              </div>
              {/* FILTER BUTTON */}
              <Button
                variant="outline"
                size="sm"
                className="gap-2 bg-transparent"
                onClick={() => setShowFilters(!showFilters)}
                type="button"
                disabled={usersLoading}
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
                  {/* MARKET CENTER */}
                  <div className="space-y-2">
                    <Label>Market Center</Label>
                    <TeamSwitcher
                      selectedMarketCenterId={selectedMarketCenterId}
                      setSelectedMarketCenterId={setSelectedMarketCenterId}
                      setCurrentPage={setCurrentPage}
                    />
                  </div>

                  {/* ROLES */}
                  <div className="space-y-2">
                    <Label>User Roles</Label>
                    <Select
                      value={selectedRole}
                      onValueChange={(value: UserRole | "all") => {
                        setSelectedRole(value);
                        setCurrentPage(1);
                      }}
                      disabled={!allUsers || !allUsers.length}
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
                              {role}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* ACTIVE / INACTIVE */}
                  <div className="space-y-2">
                    <Label>User Status</Label>
                    <Select
                      value={selectedUserStatus}
                      onValueChange={(value: UserStatusType | "all") => {
                        setSelectedUserStatus(value);
                        setCurrentPage(1);
                      }}
                      disabled={!allUsers || !allUsers.length}
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
                </div>
              </Card>
            )}
          </div>
        </CardHeader>

        <CardContent>
          <div
            className={`space-y-4 transition-opacity duration-300 ${
              usersLoading ? "opacity-50 pointer-events-none" : "opacity-100"
            }`}
          >
            <div className="flex space-x-2 justify-end">
              {/* SORT BY */}
              <div className="space-y-2">
                <Select
                  value={sortBy}
                  onValueChange={(value: UserSortBy) => {
                    setSortBy(value);
                    setCurrentPage(1);
                  }}
                  disabled={!allUsers || !allUsers.length}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={"Sort By"} />
                  </SelectTrigger>

                  <SelectContent>
                    {sortByUserOptions.map((userOption: UserSortBy) => (
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
                <Select
                  value={orderDir}
                  onValueChange={(value: OrderBy) => {
                    setOrderDir(value);
                    setCurrentPage(1);
                  }}
                  disabled={!allUsers || !allUsers.length}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={"Order by"} />
                  </SelectTrigger>
                  <SelectContent>
                    {orderByOptions.map((direction) => (
                      <SelectItem key={direction} value={direction}>
                        <div className="flex gap-1 items-center mr-1">
                          {direction === "asc" ? (
                            <ArrowDownWideNarrow />
                          ) : (
                            <ArrowUpNarrowWide />
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
            {usersLoading && (!allUsers || !allUsers.length) && (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-16 bg-muted rounded" />
                  </div>
                ))}
              </div>
            )}
            {!usersLoading &&
              allUsers &&
              allUsers.length > 0 &&
              allUsers.map((user) => {
                // let marketCenter: MarketCenter | undefined = undefined;
                // if (
                //   user?.marketCenterId &&
                //   marketCenters &&
                //   marketCenters.length > 0
                // ) {
                //   marketCenter = marketCenters.find((center) => {
                //     return center?.id === user?.marketCenterId;
                //   });
                // }
                return (
                  <UserListItem
                    key={user.id}
                    user={user}
                    deleteLabel="Deactivate"
                    onEdit={() => handleEditUser(user)}
                    onDelete={() => openDeleteModal(user)}
                    disabled={!permissions?.canDeactivateUsers}
                  />
                );
              })}

            {!usersLoading && allUsers.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No users found matching your criteria.
              </div>
            )}

            <div className="flex items-center justify-between pt-4">
              <div className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                {Math.min(currentPage * itemsPerPage, totalUsers)} of{" "}
                {totalUsers} users
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
          </div>
        </CardContent>
      </Card>

      {/* CREATE USER */}
      <CreateUser
        showCreateUserForm={showCreateUserForm}
        setShowCreateUserForm={setShowCreateUserForm}
        queryInvalidation={userQueryInvalidator}
        // refreshUserList={fetchActiveUsers} // TODO: INVALIDATE QUERY
      />

      {/* EDIT USER */}
      <Dialog open={showEditUserForm} onOpenChange={setShowEditUserForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmitEditUserForm} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Full Name *
              </label>
              <Input
                id="name"
                value={editUserFormData.name}
                onChange={(e) =>
                  setEditUserFormData({
                    ...editUserFormData,
                    name: e.target.value,
                  })
                }
                placeholder="Enter full name"
                className={formErrors.name ? "border-destructive" : ""}
              />
              {formErrors.name && (
                <p className="text-sm text-destructive">{formErrors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email Address *
              </label>
              <Input
                id="email"
                type="email"
                value={editUserFormData.email}
                onChange={(e) =>
                  setEditUserFormData({
                    ...editUserFormData,
                    email: e.target.value,
                  })
                }
                placeholder="Enter email address"
                className={formErrors.email ? "border-destructive" : ""}
              />
              {formErrors.email && (
                <p className="text-sm text-destructive">{formErrors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Role *</label>
              <Select
                value={editUserFormData.role}
                onValueChange={(value: UserRole) =>
                  setEditUserFormData({ ...editUserFormData, role: value })
                }
                disabled={!permissions?.canChangeUserRoles}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((role) => (
                    <SelectItem key={role} value={role}>
                      <div className="flex items-center gap-2">
                        {getRoleIcon(role)}
                        {role}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEditUserForm(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              {editingUser && (
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Update User"}
                </Button>
              )}
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE USER */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Deactivate user?</DialogTitle>
            <DialogDescription>
              {userToDelete ? (
                <>
                  This will deactivate{" "}
                  <span className="font-medium">{userToDelete.name}</span> (
                  {userToDelete.email}). They won’t be able to sign in, and
                  they’ll be hidden from lists. You can restore them later.
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            {/* <Button
              type="button"
              variant="outline"
              onClick={() => {
                setConfirmOpen(false);
                setUserToDelete(null);
              }}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => confirmDelete("delete")}
              disabled={deleting || !permissions?.canDeactivateUsers}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button> */}
            <Button
              type="button"
              variant="destructive"
              onClick={() => confirmDelete("deactivate")}
              disabled={deleting || !permissions?.canDeactivateUsers}
            >
              {deleting ? "Deactivating..." : "Deactivate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
