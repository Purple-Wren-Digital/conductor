"use client";

import type React from "react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useStore } from "@/context/store-provider";
import { Badge } from "../badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { InvitationUserListItem } from "@/components/ui/list-item/user-list-item-invitation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import CreateUser from "./create-user-form";
import { useUserRole } from "@/hooks/use-user-role";
import type { ClerkUser, ClerkUserUpdates } from "@/lib/utils/clerk/types";
import type { OrderBy, UserSortBy } from "@/lib/types";
import {
  ArrowDown,
  ArrowDownUp,
  ArrowUp,
  ChevronRight,
  ChevronLeft,
  Filter,
  Users,
  UserPlus,
  X,
} from "lucide-react";
import {
  formatOrderBy,
  formatPaginationText,
  formatUserOptions,
  orderByOptions,
  sortByUserOptions,
} from "@/lib/utils";
import { NewUserInvitationProps } from "@/packages/transactional/emails/types";
import { toast } from "sonner";
import { useAuth, useUser } from "@clerk/nextjs";
import { createAndSendNotification } from "@/lib/utils/notifications";

type InvitationStatus = "All" | "Accepted" | "Unaccepted" | "Unsent";
const invitationStatusOptions: InvitationStatus[] = [
  "All",
  "Accepted",
  "Unaccepted",
  "Unsent",
];

export default function UserInvitationManagement() {
  const [showFilters, setShowFilters] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);

  const [clerkUsers, setClerkUsers] = useState<any[]>([]);
  const [totalClerkUsers, setTotalClerkUsers] = useState<number>(0);

  const [selectedNewUsers, setSelectedNewUsers] = useState<any[]>([]);
  const [invitationStatus, setInvitationStatus] =
    useState<InvitationStatus>("All");

  const [sortBy, setSortBy] = useState<UserSortBy>("updatedAt");
  const [sortDir, setSortDir] = useState<OrderBy>("desc");

  const [showCreateUserForm, setShowCreateUserForm] = useState(false);
  const [isSendingInvitation, setIsSendingInvitation] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const { currentUser } = useStore();
  const { permissions } = useUserRole();
  const { getToken } = useAuth();

  // TODO: QUERY THE CLERK USERS FETCH
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    params.append("invitationStatus", invitationStatus);
    params.append("sortBy", sortBy);
    params.append("sortDir", sortDir);
    params.append("itemsPerPage", itemsPerPage.toString());
    params.append("currentPage", (currentPage - 1).toString()); // Auth0 = 0 index for pagination

    return params;
  }, [invitationStatus, sortBy, sortDir, itemsPerPage, currentPage]);

  const clearFilters = () => {
    setInvitationStatus("All");
    setSortBy("updatedAt");
    setSortDir("desc");
  };

  const hasActiveFilters =
    invitationStatus !== "All" || sortBy !== "updatedAt" || sortDir !== "desc";

  const handleSelectUser = async (selectedUser: any, checked: boolean) => {
    setSelectedNewUsers((prev) =>
      checked
        ? [...prev, selectedUser]
        : prev.filter((user) => user.email !== selectedUser.email)
    );
  };

  const fetchClerkUsers = useCallback(async () => {
    if (!permissions?.canManageAllUsers) return;
    setLoadingUsers(true);

    try {
      const response = await fetch(
        `/api/clerk/list-users`, // ${queryParams && `?${queryParams.toString()}`}
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            // Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          response?.statusText
            ? response.statusText
            : "Failed to fetch clerk users"
        );
      }
      const data = await response.json();

      setClerkUsers(data?.data ?? []);
      setTotalClerkUsers(data?.data?.length ?? 0);
    } catch (error) {
      console.error("Error fetching clerk users:", error);
    } finally {
      setLoadingUsers(false);
    }
  }, [permissions?.canManageAllUsers]); //, queryParams

  useEffect(() => {
    fetchClerkUsers();
  }, [fetchClerkUsers]);

  const handleUpdateInClerk = async (payload: ClerkUserUpdates) => {
    if (!payload?.clerkId) {
      throw new Error("Missing Clerk Id");
    }
    try {
      const response = await fetch(`/api/clerk/update-user`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error(
          response?.statusText
            ? response.statusText
            : "Failed to update user metadata"
        );
      }
      return true;
    } catch (error) {
      console.error("Failed to update user metadata:", error);
      return false;
    }
  };

  const handleSendInvitation = useCallback(
    async (newUser: ClerkUser) => {
      if (!newUser || !newUser?.id || !currentUser) {
        throw new Error("Missing payload");
      }
      setIsSendingInvitation(true);
      try {
        const token = await getToken();
        if (!token) {
          throw new Error("Failed to get authentication token");
        }
        const response = await createAndSendNotification({
          authToken: token,
          trigger: "Invitation",
          receivingUser: {
            id: newUser.id, // new clerk user id
            name: `${newUser?.first_name} ${newUser?.last_name}`,
            email: newUser.email_addresses[0].email_address,
          },
          data: {
            invitation: {
              newUserName:
                newUser?.first_name && newUser?.last_name
                  ? `${newUser?.first_name} ${newUser?.last_name}`
                  : newUser?.username,
              newUserEmail: newUser.email_addresses[0].email_address,
              newUserRole: newUser?.public_metadata?.role ?? "AGENT",
              newUserMarketCenter: null,
              inviterName: currentUser?.name,
              inviterEmail: currentUser?.email,
            } as NewUserInvitationProps,
          },
        });

        if (!response) {
          throw new Error("Failed to generate/send invitation");
        }
        const updated = await handleUpdateInClerk({
          clerkId: newUser.id,
          invited: true,
          invitedOn: new Date(),
        });

        if (!updated) {
          throw new Error("Clerk failed to update");
        }
        toast.success(`Invitation sent!`);
      } catch (error) {
        console.error("Failed to invite user", error);
      } finally {
        setIsSendingInvitation(false);
        await fetchClerkUsers();
      }
    },
    [fetchClerkUsers, getToken, currentUser]
  );

  const handleMarkUsersAsAccepted = useCallback(async () => {
    if (!selectedNewUsers || !selectedNewUsers.length) {
      throw new Error("no users selected");
    }
    setLoadingUsers(true);

    try {
      const results = await Promise.allSettled(
        selectedNewUsers.map((user: ClerkUser) =>
          handleUpdateInClerk({
            clerkId: user.id,
            accepted: true,
            acceptedOn: new Date(),
          })
        )
      );
      const failed = results.filter((r) => r.status === "rejected");

      if (failed.length) {
        console.error("Some users failed to update:", failed);
        toast.error(`Failed to update ${failed.length} user(s)`);
      } else {
        toast.success("All selected users marked as accepted");
      }
      setSelectedNewUsers([]);
    } catch (error) {
      console.error("Failed to mark user(s) as accepted in Clerk:", error);
      toast.error("Failed to mark user(s) as accepted");
    } finally {
      await fetchClerkUsers();
      setLoadingUsers(false);
    }
  }, [fetchClerkUsers, selectedNewUsers]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Created Users ({totalClerkUsers})
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Create and invite new users to join Conductor Ticketing
              </p>
            </div>
            <Button
              onClick={() => setShowCreateUserForm(true)}
              className="gap-2"
              disabled={
                !permissions?.canCreateUsers ||
                isSendingInvitation ||
                loadingUsers
              }
            >
              <UserPlus className="h-4 w-4" />
              Create New User
            </Button>
          </div>

          {/* SEARCH USERS + FILTER BUTTON */}
          <div className="space-y-4 mt-4">
            <div className="flex items-center justify-between gap-4">
              <Button
                variant="outline"
                onClick={() => handleMarkUsersAsAccepted()}
                disabled={
                  loadingUsers ||
                  !permissions?.canManageAllUsers ||
                  !selectedNewUsers.length
                }
              >
                <p>Mark User(s) as Accepted</p>
              </Button>
              <div className="flex items-center gap-4">
                {/* FILTER BUTTON */}
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 bg-transparent"
                  onClick={() => setShowFilters(!showFilters)}
                  type="button"
                  disabled={loadingUsers}
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
            </div>
            {showFilters && (
              <Card className="p-4 bg-muted/50">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {/* INVITE STATUS */}
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={invitationStatus}
                      onValueChange={(value: InvitationStatus) => {
                        setInvitationStatus(value);
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        {invitationStatusOptions.map((status) => (
                          <SelectItem key={status} value={status}>
                            <div className="flex items-center gap-2 mr-1">
                              <p>{status} Invitations</p>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* SORT BY */}
                  <div className="space-y-2">
                    <div className="flex gap-1">
                      <ArrowDownUp className="w-4 h-4" />
                      <Label>Sort</Label>
                    </div>
                    <Select
                      value={sortBy}
                      onValueChange={(value: UserSortBy) => {
                        setSortBy(value);
                        setCurrentPage(1);
                      }}
                      disabled={!clerkUsers || !clerkUsers.length}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={"Sort By"}
                          className="text-sm font-medium"
                        />
                      </SelectTrigger>

                      <SelectContent>
                        {sortByUserOptions.map((userOption: UserSortBy) => {
                          if (userOption === "name") return null;
                          return (
                            <SelectItem
                              key={userOption}
                              value={userOption}
                              className="text-sm font-medium"
                            >
                              {formatUserOptions(userOption)}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* ORDER BY */}
                  <div className="space-y-2">
                    <Label>Order</Label>
                    <Select
                      value={sortDir}
                      onValueChange={(value: OrderBy) => {
                        setSortDir(value);
                        setCurrentPage(1);
                      }}
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
          {loadingUsers && clerkUsers && clerkUsers.length === 0 ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-16 bg-muted rounded" />
                </div>
              ))}
            </div>
          ) : (
            <div
              className={`space-y-4 transition-opacity duration-300 ${
                loadingUsers ? "opacity-50 pointer-events-none" : "opacity-100"
              }`}
            >
              {!loadingUsers &&
                clerkUsers &&
                clerkUsers.length > 0 &&
                clerkUsers.map((user: ClerkUser, index) => {
                  // console.log(
                  //   user?.email_addresses[0]?.email_address,
                  //   "Clerk User Id",
                  //   user.id
                  // );
                  return (
                    <InvitationUserListItem
                      key={index}
                      disabled={
                        isSendingInvitation ||
                        !permissions?.canManageAllUsers ||
                        user?.public_metadata?.accepted === true
                      }
                      onInvite={() => handleSendInvitation(user)}
                      selected={selectedNewUsers.includes(user)}
                      onSelect={(checked: boolean) =>
                        handleSelectUser(user, checked)
                      }
                      selectable={!user?.public_metadata?.accepted}
                      user={{
                        name:
                          user?.first_name && user?.last_name
                            ? `${user?.first_name} ${user?.last_name}`
                            : user?.email_addresses[0]?.email_address,
                        email: user?.email_addresses[0]?.email_address,
                        emailVerified:
                          user?.email_addresses?.[0]?.verification?.status ??
                          "unknown",
                        user_metadata: {
                          created: user?.created_at
                            ? new Date(user.created_at)
                            : null,
                          //   createdBy: user.user_metadata?.createdBy || "unknown",
                          invited: user.public_metadata?.invited || false,
                          invitedOn: user?.public_metadata?.invitedOn
                            ? new Date(user.public_metadata.invitedOn)
                            : null,
                          accepted: user?.public_metadata?.accepted || false,
                          acceptedOn: user?.public_metadata?.acceptedOn
                            ? new Date(user.public_metadata.acceptedOn)
                            : null,
                          role:
                            user?.public_metadata?.role || "No role assigned",
                        },
                      }}
                    />
                  );
                })}
              {(!clerkUsers || clerkUsers.length === 0) && !loadingUsers && (
                <div className="text-center py-8 text-muted-foreground">
                  No users found matching your criteria.
                </div>
              )}
            </div>
          )}
          <div className="flex items-center justify-between pt-4">
            <div className="text-sm text-muted-foreground">
              Showing{" "}
              {formatPaginationText({
                totalItems: clerkUsers?.length ?? 0,
                itemsPerPage,
                currentPage,
              })}{" "}
              of {totalClerkUsers} Total Users
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
              {/* <span className="text-sm">
                {currentPage} / {totalPages}
              </span> */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => p + 1)}
                // disabled={currentPage === totalPages}
                type="button"
              >
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CREATE USER */}
      <CreateUser
        showCreateUserForm={showCreateUserForm}
        setShowCreateUserForm={setShowCreateUserForm}
        queryInvalidation={fetchClerkUsers}
      />
    </div>
  );
}
