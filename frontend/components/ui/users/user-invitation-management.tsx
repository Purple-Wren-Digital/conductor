"use client";

import type React from "react";
import { useState, useEffect, useCallback } from "react";
import { useStore } from "@/app/store-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUserRole } from "@/lib/hooks/use-user-role";
import type { UserRole } from "@/lib/types";
import { InvitationUserListItem } from "../list-item/user-list-item-invitation";
import { Users, UserPlus } from "lucide-react";
import { toast } from "sonner";
import UserCreate from "./user-creation";

type Auth0User = {
  user_id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  username: string;
  user_metadata: {
    created: Date | null;
    createdBy: string;
    invited: boolean;
    invitedOn: Date | null;
    role: UserRole;
  };
};

type InviteUserResendType = {
  newUserName: string;
  newUserEmail: string;
  newUserRole: UserRole;
  inviterName: string;
  inviterEmail: string;
  inviteLink: string;
};

export default function UserInvitationManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  // const [searchQuery, setSearchQuery] = useState("");
  // const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
  // const [selectedRole, setSelectedRole] = useState<UserRole | "all">("all");

  const [showCreateUserForm, setShowCreateUserForm] = useState(false);
  const [isSendingInvitation, setIsSendingInvitation] = useState(false);

  const { currentUser } = useStore();
  const { permissions } = useUserRole();

  // useEffect(() => {
  //   const handler = setTimeout(() => setDebouncedSearchQuery(searchQuery), 500);
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

  const fetchCreatedUsers = async () => {
    if (!permissions?.canManageAllUsers) return;
    setLoading(true);

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
        setUsers(data.users);
        return;
      }
      setUsers([]);
    } catch (error) {
      console.error("Error fetching unverified users:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCreatedUsers();
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
    newUserName,
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
          newUserName: newUserName,
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

  const updateAuth0UserMetadata = async (auth0Id: string, token: string) => {
    try {
      const response = await fetch(`/api/admin/auth0Users`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ user_id: auth0Id }),
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
        newUserName: user.name,
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
      const metadataResult = await updateAuth0UserMetadata(user.user_id, token);
      if (!metadataResult) {
        throw new Error("Failed to update user metadata after invitation");
      }
      // Refresh user list to show updated status
      await fetchCreatedUsers();
      toast.success(`Invitation sent to ${user.email}`);
    } catch (error) {
      console.error("Error sending invitation:", error);
    } finally {
      setIsSendingInvitation(false);
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
                New Users ({users.length})
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Create and invite new users to join Conductor Ticketing
              </p>
            </div>
            <Button
              onClick={() => setShowCreateUserForm(true)}
              className="gap-2"
              disabled={!permissions?.canCreateUsers || isSendingInvitation}
            >
              <UserPlus className="h-4 w-4" />
              Create New User
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading && users.length === 0 ? (
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
                loading ? "opacity-50 pointer-events-none" : "opacity-100"
              }`}
            >
              {users.map((user, index) => (
                <InvitationUserListItem
                  key={index}
                  disabled={
                    isSendingInvitation ||
                    !permissions?.canManageAllUsers ||
                    user?.user_metadata.accepted
                  }
                  onInvite={() => handleInviteUser(user)}
                  user={{
                    name: user.name,
                    username: user.username,
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

              {users.length === 0 && !loading && (
                <div className="text-center py-8 text-muted-foreground">
                  No users found matching your criteria.
                </div>
              )}
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
