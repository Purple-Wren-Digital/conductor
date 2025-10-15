"use client";

import type React from "react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useStore } from "@/app/store-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import CreateUser from "./create-user-form";
import { useUserRole } from "@/hooks/use-user-role";
import type { OrderBy, UserRole, UserSortBy } from "@/lib/types";
import { InvitationUserListItem } from "../list-item/user-list-item-invitation";
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
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { NewUserInvitationProps } from "@/packages/transactional/emails/UserInvitation";
import {
  formatOrderBy,
  formatPaginationText,
  formatUserOptions,
  orderByOptions,
  sortByUserOptions,
} from "@/lib/utils";
import { Badge } from "../badge";

type Auth0User = {
  user_id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  user_metadata: {
    created: Date | null;
    createdBy: string;
    invited: boolean;
    invitedOn: Date | null;
    accepted: boolean;
    acceptedOn: Date | null;
    role: UserRole;
    marketCenterId: string | null;
  };
};

type Auth0UserMetadataType = {
  auth0Id: string;
  token: string;
  invited?: boolean;
  invitedOn?: Date;
  accepted?: boolean;
  acceptedOn?: Date;
};

type InvitationStatus = "All" | "Accepted" | "Unaccepted" | "Unsent";
const invitationStatusOptions: InvitationStatus[] = [
  "All",
  "Accepted",
  "Unaccepted",
  "Unsent",
];

export default function UserInvitationManagement() {
  const router = useRouter();

  const [showFilters, setShowFilters] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // const [searchQuery, setSearchQuery] = useState("");
  // const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);

  const [newAuth0Users, setNewAuth0Users] = useState<any[]>([]);
  const [totalAuth0Users, setTotalAuth0Users] = useState<number>(0);

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

  const handleRefresh = async () => {
    router.refresh();
  };

  const fetchManagementToken = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/managementToken", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: currentUser?.role || "AGENT" }),
      });
      if (!response.ok) {
        throw new Error(response.statusText || "Failed to fetch token");
      }
      const data = await response.json();
      return data.managementToken;
    } catch (error) {
      console.error("Failed to fetch management token: ", error);
      return null;
    }
  }, []);

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    params.append("invitationStatus", invitationStatus);
    params.append("sortBy", sortBy);
    params.append("sortDir", sortDir);
    params.append("itemsPerPage", itemsPerPage.toString());
    params.append("currentPage", (currentPage - 1).toString()); // Auth0 = 0 index for pagination

    return params;
  }, [invitationStatus, sortBy, sortDir, itemsPerPage, currentPage]);

  const fetchNewAuth0Users = useCallback(async () => {
    if (!permissions?.canManageAllUsers) return;
    setLoadingUsers(true);

    try {
      const token = await fetchManagementToken();
      if (!token) {
        throw new Error("No management token available");
      }

      const response = await fetch(
        `/api/admin/auth0Users${queryParams && `?${queryParams.toString()}`}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      console.log("FRINT END RESPONSE", response);

      if (!response.ok) {
        throw new Error(
          response?.statusText ? response.statusText : "Failed to fetch users"
        );
      }
      const data = await response.json();

      setNewAuth0Users(data?.users ?? []);
      setTotalAuth0Users(data?.total ?? 0);
    } catch (error) {
      console.error("Error fetching unverified users:", error);
    } finally {
      setLoadingUsers(false);
    }
  }, [queryParams, fetchManagementToken]);

  useEffect(() => {
    fetchNewAuth0Users();
  }, [fetchNewAuth0Users]);

  const clearFilters = () => {
    setInvitationStatus("All");
    setSortBy("updatedAt");
    setSortDir("desc");
  };

  const hasActiveFilters =
    invitationStatus !== "All" || sortBy !== "updatedAt" || sortDir !== "desc";

  const generatePasswordResetLink = async (auth0Id: string, token: string) => {
    try {
      const response = await fetch("/api/admin/auth0PasswordReset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ auth0Id: auth0Id }),
      });

      if (!response.ok) {
        throw new Error(
          response?.statusText
            ? response.statusText
            : "Failed to generate password reset link"
        );
      }
      const data = await response.json();
      if (!data || !data?.ticket) {
        throw new Error("No password reset link returned from Auth0");
      }

      return data.ticket;
    } catch (error) {
      console.error("Error generating password reset link:", error);
      return null;
    }
  };

  const sendSingUpInviteEmail = async ({
    newUserEmail,
    newUserRole,
    newUserMarketCenter,
    inviterName,
    inviterEmail,
    inviteLink,
  }: NewUserInvitationProps) => {
    try {
      const response = await fetch("/api/send/inviteUser", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          newUserEmail: newUserEmail,
          newUserRole: newUserRole,
          newUserMarketCenter: newUserMarketCenter,
          inviterName: inviterName,
          inviterEmail: inviterEmail,
          inviteLink: inviteLink,
        } as NewUserInvitationProps),
      });
      if (!response.ok) {
        throw new Error(
          response?.statusText
            ? response.statusText
            : "Failed to send invitation email"
        );
      }
      return true;
    } catch (error) {
      console.error("Resend unable to send invite email:", error);
      return false;
    }
  };

  const updateAuth0UserMetadata = async (metadata: Auth0UserMetadataType) => {
    let body: {
      user_id: string;
      invited?: boolean;
      invitedOn?: Date;
      accepted?: boolean;
      acceptedOn?: Date;
    };
    if (metadata.auth0Id && metadata?.invited && metadata?.invitedOn) {
      body = {
        user_id: metadata.auth0Id,
        invited: metadata.invited,
        invitedOn: metadata.invitedOn,
      };
    } else if (metadata.auth0Id && metadata?.accepted && metadata?.acceptedOn) {
      body = {
        user_id: metadata.auth0Id,
        accepted: metadata.accepted,
        acceptedOn: metadata.acceptedOn,
      };
    } else {
      throw new Error("Nothing to update");
    }
    try {
      const response = await fetch(`/api/admin/auth0Users`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${metadata.token}`,
        },
        body: JSON.stringify(body),
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

  const handleInviteUserToApp = async (user: Auth0User) => {
    setIsSendingInvitation(true);
    try {
      const token = await fetchManagementToken();
      if (!token) {
        throw new Error("No management token available");
      }
      //  Generate password reset link from Auth0
      const inviteLink = await generatePasswordResetLink(user.user_id, token);
      if (!inviteLink) {
        throw new Error("No password reset link returned from Auth0");
      }
      // Send email with Resend
      const emailResult = await sendSingUpInviteEmail({
        newUserName: user.name ?? "",
        newUserEmail: user.email,
        newUserRole: user?.user_metadata?.role || "AGENT",
        newUserMarketCenter: user?.user_metadata?.marketCenterId || null,
        inviterName: currentUser?.name || "Admin User",
        inviterEmail: currentUser?.email || "onboarding@resend.dev", // TODO: tech support email ?
        inviteLink: inviteLink,
      });

      if (!emailResult) {
        throw new Error("Resend failed to send invitation email");
      }

      // Update user metadata to mark as invited
      const metadataResult = await updateAuth0UserMetadata({
        auth0Id: user.user_id,
        token: token,
        invited: true,
        invitedOn: new Date(),
      });
      if (!metadataResult) {
        throw new Error("Failed to update user metadata after invitation");
      }
      // Refresh user list to show updated status
      await fetchNewAuth0Users();
      handleRefresh();
      toast.success(`Invitation sent to ${user.email}`);
    } catch (error) {
      console.error("Error sending invitation:", error);
    } finally {
      setIsSendingInvitation(false);
    }
  };

  const handleSelectUser = async (selectedUser: any, checked: boolean) => {
    setSelectedNewUsers((prev) =>
      checked
        ? [...prev, selectedUser]
        : prev.filter((user) => user.email !== selectedUser.email)
    );
  };

  const handleMarkUsersAsAccepted = async () => {
    if (!selectedNewUsers || !selectedNewUsers.length) {
      throw new Error("no users selected");
    }
    setLoadingUsers(true);

    try {
      const acceptedOn = new Date();
      const token = await fetchManagementToken();
      if (!token) {
        throw new Error("No management token available");
      }
      const results = await Promise.allSettled(
        selectedNewUsers.map((user) =>
          updateAuth0UserMetadata({
            auth0Id: user.user_id,
            accepted: true,
            acceptedOn,
            token: token,
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

      await fetchNewAuth0Users();

      return;
    } catch (error) {
      console.error("Failed to mark user(s) as accepted:", error);
      toast.error("Failed to mark user(s) as accepted");
    } finally {
      setLoadingUsers(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Created Users ({totalAuth0Users})
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
                onClick={handleMarkUsersAsAccepted}
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
                      disabled={!newAuth0Users || !newAuth0Users.length}
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
          {loadingUsers && newAuth0Users && newAuth0Users.length === 0 ? (
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
                newAuth0Users &&
                newAuth0Users.length > 0 &&
                newAuth0Users.map((user, index) => (
                  <InvitationUserListItem
                    key={index}
                    disabled={
                      isSendingInvitation ||
                      !permissions?.canManageAllUsers ||
                      user?.user_metadata?.accepted
                    }
                    onInvite={() => handleInviteUserToApp(user)}
                    selected={selectedNewUsers.includes(user)}
                    onSelect={(checked: boolean) =>
                      handleSelectUser(user, checked)
                    }
                    selectable={!user?.user_metadata?.accepted}
                    user={{
                      name: user?.name,
                      email: user?.email,
                      emailVerified: user?.email_verified,
                      user_metadata: {
                        created: user.user_metadata?.created
                          ? new Date(user.user_metadata.created)
                          : null,
                        createdBy: user.user_metadata?.createdBy || "unknown",
                        invited: user.user_metadata?.invited || false,
                        invitedOn: user?.user_metadata?.invitedOn
                          ? new Date(user.user_metadata.invitedOn)
                          : null,
                        accepted: user?.user_metadata?.accepted || false,
                        acceptedOn: user?.user_metadata?.acceptedOn
                          ? new Date(user.user_metadata.acceptedOn)
                          : null,
                        role: user.user_metadata?.role || "AGENT",
                      },
                    }}
                  />
                ))}
              {(!newAuth0Users || newAuth0Users.length === 0) &&
                !loadingUsers && (
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
                totalItems: newAuth0Users?.length ?? 0,
                itemsPerPage,
                currentPage,
              })}{" "}
              of {totalAuth0Users} Total Users
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
        queryInvalidation={fetchNewAuth0Users}
      />
    </div>
  );
}
