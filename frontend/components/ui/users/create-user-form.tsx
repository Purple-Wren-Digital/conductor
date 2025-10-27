"use client";

import type React from "react";
import { useState, useCallback } from "react";
import type { MarketCenter, PrismaUser, UserRole } from "@/lib/types";
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
import { useUserRole } from "@/hooks/use-user-role";
import { Building, User } from "lucide-react";
import { ROLE_ICONS, roleOptions } from "@/lib/utils";
import { toast } from "sonner";
import { useStore } from "@/app/store-provider";
import { useUser } from "@clerk/nextjs";
import { API_BASE } from "@/lib/api/utils";
import { useMutation } from "@tanstack/react-query";
import { useFetchAllMarketCenters } from "@/hooks/use-market-center";
import { TeamSwitcher } from "../team-switcher";

interface CreateAuth0UserRequest {
  createdBy: string; // current user's auth0id
  name: string;
  email: string;
  role: UserRole;
  marketCenterId: string | null;
}

interface CreateAuth0UserForm {
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole | string;
}

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
  };
};

type CreateUserProps = {
  showCreateUserForm: boolean;
  setShowCreateUserForm: React.Dispatch<React.SetStateAction<boolean>>;
  handleInviteUser?: (user: Auth0User) => Promise<void>;
  queryInvalidation: () => Promise<void>;
};

export default function CreateUser({
  showCreateUserForm,
  setShowCreateUserForm,
  handleInviteUser,
  queryInvalidation,
}: CreateUserProps) {
  const { user: clerkUser } = useUser();
  const { currentUser } = useStore();

  const [newUserFormData, setNewUserFormData] = useState<CreateAuth0UserForm>({
    firstName: "",
    lastName: "",
    email: "",
    role: "",
  });
  const [selectedMarketCenterId, setSelectedMarketCenterId] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { role, permissions } = useUserRole();

  const { data, isLoading } = useFetchAllMarketCenters(role);

  const marketCenters: MarketCenter[] = data?.marketCenters ?? [];

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
          marketCenterId:
            selectedMarketCenterId !== "null" ? selectedMarketCenterId : null,
        } as CreateAuth0UserRequest),
      });
      if (!response.ok) {
        throw new Error(response.statusText || "Failed to create user");
      }
      const data = await response.json();
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
      const accessToken = clerkUser?.id || "";
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
          marketCenterId:
            selectedMarketCenterId !== "null" ? selectedMarketCenterId : "",
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

  const createUserMutation = useMutation({
    mutationFn: async () => {
      const newAuth0User = await createNewAuth0User();
      if (!newAuth0User || !newAuth0User?.user_id) {
        throw new Error("Failed to create new Auth0 User");
      }
      const newPrismaUser = await createNewPrismaUser(newAuth0User.user_id);
      if (!newPrismaUser) {
        throw new Error(
          "Auth0 user created, but Failed to create new Prisma User"
        );
      }
    },
    onSuccess: async (newAuth0User: any) => {
      toast.success(`${newAuth0User?.name || "User"} was removed`);
      toast.success("User created!");

      if (handleInviteUser) {
        toast.success("User created! Sending invitation now...");
        await handleInviteUser(newAuth0User);
      }
      setShowCreateUserForm(false);
      setFormErrors({});
      queryInvalidation;
    },
    onError: (error) => {
      console.error("Failed to create new user: ", error);
      toast.error("Failed to create new user");
    },
  });

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
    createUserMutation.mutate();

    setIsSubmitting(false);
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
            {/* FIRST NAME */}
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                First Name *
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
                placeholder="Enter first name"
                className={formErrors.firstName ? "border-destructive" : ""}
              />
              {formErrors.firstName && (
                <p className="text-sm text-destructive">
                  {formErrors.firstName}
                </p>
              )}
            </div>
            {/* LAST NAME */}
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
            {/* EMAIL */}
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

            {/* ROLE */}
            <div className="space-y-2">
              <label
                className={`text-sm font-medium ${!permissions?.canChangeUserRoles && "text-muted-foreground"}`}
              >
                Role *
              </label>
              <Select
                value={newUserFormData.role}
                onValueChange={(value: UserRole) =>
                  setNewUserFormData({ ...newUserFormData, role: value })
                }
                disabled={!permissions?.canChangeUserRoles}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Assign a role" />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((role) => (
                    <SelectItem key={role} value={role}>
                      {getRoleIcon(role)}
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.role && (
                <p className="text-sm text-destructive">{formErrors.role}</p>
              )}
            </div>

            {/* MARKET CENTER */}
            <div className="space-y-2">
              <label
                className={`text-sm font-medium ${!permissions?.canManageAllUsers && "text-muted-foreground"}`}
              >
                Market Center
              </label>
              <Select
                value={selectedMarketCenterId}
                onValueChange={(value) => {
                  setSelectedMarketCenterId(value);
                }}
                disabled={isLoading || role === "STAFF"}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a team" />
                </SelectTrigger>
                <SelectContent>
                  {marketCenters &&
                    marketCenters.length > 0 &&
                    marketCenters.map((mc) => (
                      <SelectItem key={mc.id} value={mc.id}>
                        <Building className="h-4 w-4" />

                        {mc.name}
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
