"use client";

import type React from "react";
import { useState, useEffect, useCallback } from "react";
import { useStore } from "@/app/store-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUserRole } from "@/lib/hooks/use-user-role";
import type { UserRole } from "@/lib/types";
import { InvitationUserListItem } from "../list-item/user-list-item-invitation";
import { Users, UserPlus, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import UserCreate from "./user-creation";

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
    role: UserRole;
  };
};

type InviteUserResendType = {
  newUserEmail: string;
  newUserRole: UserRole;
  inviterName: string;
  inviterEmail: string;
  inviteLink: string;
};

type Auth0UserMetadataType = {
  auth0Id: string;
  token: string;
  invited?: boolean;
  invitedOn?: Date;
  accepted?: boolean;
  acceptedOn?: Date;
};

export default function UserInvitationManagement() {
  const [newAuth0Users, setNewAuth0Users] = useState<any[]>([]);
  const [selectedNewUsers, setSelectedNewUsers] = useState<any[]>([]);

  const [showCreateUserForm, setShowCreateUserForm] = useState(false);
  const [isSendingInvitation, setIsSendingInvitation] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // const [searchQuery, setSearchQuery] = useState("");
  // const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const totalUsers: number = newAuth0Users.length ?? 0;
  const totalPages = Math.ceil(totalUsers / itemsPerPage);

  const { currentUser } = useStore();
  const { permissions } = useUserRole();

  // useEffect(() => {
  //   const handler = setTimeout(() => {
  //     setDebouncedSearchQuery(searchQuery);
  //     setCurrentPage(1);
  //   }, 500);
  //   return () => clearTimeout(handler);
  // }, [searchQuery]);

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

  const fetchNewAuth0Users = async () => {
    if (!permissions?.canManageAllUsers) return;
    setLoadingUsers(true);

    try {
      const token = await fetchManagementToken();
      if (!token) {
        throw new Error("No management token available");
      }

      const response = await fetch(`/api/admin/auth0Users`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(
          response?.statusText ? response.statusText : "Failed to fetch users"
        );
      }
      const data = await response.json();
      if (data && data?.users && data?.users.length) {
        setNewAuth0Users(data.users);
        return;
      }
      setNewAuth0Users([]);
    } catch (error) {
      console.error("Error fetching unverified users:", error);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchNewAuth0Users();
  }, []);

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
    inviterName,
    inviterEmail,
    inviteLink,
  }: InviteUserResendType) => {
    try {
      const response = await fetch("/api/send/inviteUser", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          newUserEmail: newUserEmail,
          newUserRole: newUserRole,
          inviterName: inviterName,
          inviterEmail: inviterEmail,
          inviteLink: inviteLink,
        } as InviteUserResendType),
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
      console.log("Update user metadata response:", response);
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

  const handleInviteUser = async (user: Auth0User) => {
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
        newUserEmail: user.email,
        newUserRole: user?.user_metadata?.role || "AGENT",
        inviterName: currentUser?.name || "Admin",
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
      console.log("Mark Accepted Results -", results);
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
                New Users ({newAuth0Users.length})
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
          <div className="flex items-center gap-4 mt-4">
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
          </div>
        </CardHeader>
        <CardContent>
          {loadingUsers && newAuth0Users.length === 0 ? (
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
              {newAuth0Users.map((user, index) => (
                <InvitationUserListItem
                  key={index}
                  disabled={
                    isSendingInvitation ||
                    !permissions?.canManageAllUsers ||
                    user?.user_metadata?.accepted
                  }
                  onInvite={() => handleInviteUser(user)}
                  selected={selectedNewUsers.includes(user)}
                  onSelect={(checked: boolean) =>
                    handleSelectUser(user, checked)
                  }
                  selectable={!user?.user_metadata?.accepted}
                  user={{
                    name: user.name,
                    email: user.email,
                    emailVerified: user.email_verified,
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

              {newAuth0Users.length === 0 && !loadingUsers && (
                <div className="text-center py-8 text-muted-foreground">
                  No users found matching your criteria.
                </div>
              )}
            </div>
          )}
          {totalPages > 1 && ( // TODO: check logic
            <div className="flex items-center justify-between pt-4">
              <div className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                {Math.min(currentPage * itemsPerPage, totalUsers)} of{" "}
                {totalUsers} Users
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
        </CardContent>
      </Card>

      {/* CREATE USER */}
      <UserCreate
        showCreateUserForm={showCreateUserForm}
        setShowCreateUserForm={setShowCreateUserForm}
      />
    </div>
  );
}
