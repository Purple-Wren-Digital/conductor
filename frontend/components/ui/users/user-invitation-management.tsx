"use client";

import type React from "react";
import { useState, useEffect, useCallback } from "react";
import type { UserRole } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUserRole } from "@/lib/hooks/use-user-role";
import { Users, UserPlus } from "lucide-react";
import { InvitationUserListItem } from "../list-item/user-list-item-invitation";
import UserCreate from "./user-creation";
import { useStore } from "@/app/store-provider";

type Auth0User = {
  user_id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  username: string;
  user_metadata: {
    created: Date | null;
    createdBy: string; // auth0Id of the Admin who created this user
    invited: boolean;
    invitedOn: Date | null;
    role: UserRole;
  };
};

export default function UserInvitationManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [showCreateUserForm, setShowCreateUserForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSendingInvitation, setIsSendingInvitation] = useState(false);

  const { currentUser } = useStore();
  const { permissions } = useUserRole();

  const handleCreateUser = () => {
    setShowCreateUserForm(true);
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
      console.log("Password reset response:", response);
      if (!response.ok) {
        throw new Error(
          response?.statusText
            ? response.statusText
            : "Failed to generate password reset link"
        );
      }
      const data = await response.json();
      console.log("Password reset data:", data);
      const inviteLink = data.ticket;
      if (!inviteLink) {
        throw new Error("No password reset link returned from Auth0");
      }
      return inviteLink;
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
  }: {
    newUserName: string;
    newUserEmail: string;
    newUserRole: UserRole;
    inviterName: string;
    inviterEmail: string;
    inviteLink: string;
  }) => {
    try {
      // Send invitation email with link via Resend
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
        } as {
          newUserName: string;
          newUserEmail: string;
          newUserRole: UserRole;
          inviterName: string;
          inviterEmail: string;
          inviteLink: string;
        }),
      });
      console.log("Invite email response:", response);
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

  const handleInviteUser = async (user: Auth0User) => {
    setIsSendingInvitation(true);
    console.log("Sending invitation to user:", user);
    try {
      // Get password reset link from Auth0
      const token = await fetchManagementToken();
      if (!token) {
        throw new Error("No management token available");
      }
      const inviteLink = await generatePasswordResetLink(user.user_id, token);
      if (!inviteLink) {
        throw new Error("No password reset link returned from Auth0");
      }
      const emailResult = await sendSingUpInviteEmail({
        newUserName: user.name,
        newUserEmail: user.email,
        newUserRole: user?.user_metadata?.role || "AGENT",
        inviterName: currentUser?.name || "Admin",
        inviterEmail: currentUser?.email || "onboarding@resend.dev", // TODO: tech support email ?
        inviteLink: inviteLink,
      });

      if (!emailResult) {
        throw new Error("No password reset link sent with Resend");
      }

      // Update user metadata to mark as invited
      // const updateResponse = await fetch(`https://${process.env.AUTH0_DOMAIN}/api/v2/users/${user.auth0Id}`, {
      //   method: "PATCH", // Permission update:users
      //   headers: {
      //     "Content-Type": "application/json",
      //     Accept: "application/json",
      //     Authorization: `Bearer ${token}`,
      //   },
      //   body: JSON.stringify({
      //     user_metadata: {
      //       invited: true,
      //       invitedOn: new Date(),
      //     },
      //   }),
      // });
      // if (!updateResponse.ok) {
      //   throw new Error(
      //     updateResponse?.statusText
      //       ? updateResponse.statusText
      //       : "Failed to update user metadata"
      //   );
      // }
    } catch (error) {
      console.error("Error sending invitation:", error);
    } finally {
      setIsSendingInvitation(false);
    }
  };

  const fetchCreatedUsers = async () => {
    if (!permissions?.canManageAllUsers) return;
    setLoading(true);

    try {
      const token = await fetchManagementToken();
      if (!token) {
        throw new Error("No management token available");
      }

      const response = await fetch(`/api/admin/auth0Users`, {
        method: "GET", // Permission read:users
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
    if (!permissions?.canManageAllUsers) return;
    fetchCreatedUsers();
  }, []); // permissions, fetchCreatedUsers

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
              onClick={handleCreateUser}
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
