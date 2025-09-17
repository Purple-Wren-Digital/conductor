"use client";

import type React from "react";
import { useState, useCallback } from "react";
import type { PrismaUser, UserRole } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog/base-dialog";
import { useUserRole } from "@/lib/hooks/use-user-role";
import { User } from "lucide-react";
import { ROLE_ICONS } from "@/lib/utils";
import { toast } from "sonner";
import { useStore } from "@/app/store-provider";
import { getAccessToken } from "@auth0/nextjs-auth0";
import { API_BASE } from "@/lib/api/utils";

interface CreateAuth0UserRequest {
  createdBy: string; // current user's auth0id
  name: string;
  email: string;
  role: UserRole;
}

interface CreateAuth0UserForm {
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
}

const roleOptions: UserRole[] = ["AGENT", "STAFF", "ADMIN"];

type UserInviteProps = {
  showCreateUserForm: boolean;
  setShowCreateUserForm: React.Dispatch<React.SetStateAction<boolean>>;
};

export default function UserCreate({
  showCreateUserForm,
  setShowCreateUserForm,
}: UserInviteProps) {
  const { currentUser } = useStore();

  const [newUserFormData, setNewUserFormData] = useState<CreateAuth0UserForm>({
    firstName: "",
    lastName: "",
    email: "",
    role: "AGENT",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { permissions } = useUserRole();

  const getAuth0AccessToken = useCallback(async () => {
    if (process.env.NODE_ENV === "development") return "local";
    return await getAccessToken();
  }, []);

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

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!newUserFormData.firstName.trim())
      errors.firstName = "First name is required";
    if (!newUserFormData.lastName.trim())
      errors.lastName = "Last name is required";

    if (!newUserFormData.email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newUserFormData.email)) {
      errors.email = "Invalid email format";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const createNewAuth0User = async () => {
    try {
      const token = await fetchManagementToken();
      if (!token) {
        throw new Error("No management token available");
      }
      const response = await fetch("/api/admin/auth0Users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...newUserFormData,
          name: `${newUserFormData.firstName} ${newUserFormData.lastName}`,
          createdBy: currentUser?.auth0Id || "system",
        } as CreateAuth0UserRequest),
      });
      if (!response.ok) {
        throw new Error(response.statusText || "Failed to create user");
      }
      const data = await response.json();

      console.log("response from /api/admin/createUser:", response);
      console.log("data from /api/admin/createUser:", data);
      return data;
    } catch (error) {
      console.error("Failed to create new Auth0 User", error);
      return null;
    }
  };

  const createNewPrismaUser = async (auth0Id: string) => {
    if (!auth0Id) {
      throw new Error("Missing auth0Id");
    }
    try {
      const accessToken = await getAuth0AccessToken();
      const response = await fetch(`${API_BASE}/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
        body: JSON.stringify({
          email: newUserFormData.email,
          name: `${newUserFormData.firstName} ${newUserFormData.lastName}`,
          role: newUserFormData.role || "AGENT",
          auth0Id: auth0Id,
          viaAdmin: true,
        }),
      });
      if (response.ok) {
        const data: { user: PrismaUser } = await response.json();
        return data;
      }
    } catch (error) {
      console.error("Failed to create prisma user", error);
      return null;
    }
  };

  const handleSubmitCreateUserForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!permissions?.canCreateUsers) {
      toast.error("You do not have permission to create users.");
      return;
    }
    setFormErrors({});
    if (!validateForm()) {
      toast.error("Invalid input(s)");
      return;
    }
    setIsSubmitting(true);

    try {
      const newAuth0User = await createNewAuth0User();
      console.log("New Auth0 User", newAuth0User);
      if (!newAuth0User || !newAuth0User?.user_id) {
        throw new Error("Failed to create new Auth0 User");
      }
      const newPrismaUser = await createNewPrismaUser(newAuth0User.user_id);
      if (!newPrismaUser) {
        throw new Error(
          "Auth0 user created, but Failed to create new Prisma User"
        );
      }
      setShowCreateUserForm(false);
      toast.success("User created! Remember to send the invitation.");
    } catch (error) {
      console.error("Failed to create new user: ", error);
      toast.error("Failed to Create User");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleIcon = (role: string) => {
    const Icon = ROLE_ICONS[role as keyof typeof ROLE_ICONS] || User;
    return <Icon className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      {/* CREATE/EDIT USER */}
      <Dialog open={showCreateUserForm} onOpenChange={setShowCreateUserForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmitCreateUserForm} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Full Name *
              </label>
              <Input
                id="name"
                value={newUserFormData.firstName}
                onChange={(e) =>
                  setNewUserFormData({
                    ...newUserFormData,
                    firstName: e.target.value,
                  })
                }
                placeholder="Enter full name"
                className={formErrors.firstName ? "border-destructive" : ""}
              />
              {formErrors.firstName && (
                <p className="text-sm text-destructive">
                  {formErrors.firstName}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Last Name *
              </label>
              <Input
                id="name"
                value={newUserFormData.lastName}
                onChange={(e) =>
                  setNewUserFormData({
                    ...newUserFormData,
                    lastName: e.target.value,
                  })
                }
                placeholder="Enter last name"
                className={formErrors.lastName ? "border-destructive" : ""}
              />
              {formErrors.lastName && (
                <p className="text-sm text-destructive">
                  {formErrors.lastName}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email Address *
              </label>
              <Input
                id="email"
                type="email"
                value={newUserFormData.email}
                onChange={(e) =>
                  setNewUserFormData({
                    ...newUserFormData,
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
                value={newUserFormData.role}
                onValueChange={(value: UserRole) =>
                  setNewUserFormData({ ...newUserFormData, role: value })
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
                onClick={() => setShowCreateUserForm(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Create User"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
