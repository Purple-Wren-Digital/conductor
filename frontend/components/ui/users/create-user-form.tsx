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
import { useUser } from "@clerk/nextjs";
import { API_BASE } from "@/lib/api/utils";
import { useMutation } from "@tanstack/react-query";
import { useFetchAllMarketCenters } from "@/hooks/use-market-center";
// import { ClerkCreateUser } from "@/lib/clerk/types";
// import { TeamSwitcher } from "../team-switcher";

interface CreateClerkUserForm {
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole | string;
}

type CreateUserProps = {
  showCreateUserForm: boolean;
  setShowCreateUserForm: React.Dispatch<React.SetStateAction<boolean>>;
  handleInviteUser?: () => Promise<void>;
  queryInvalidation: () => Promise<void>;
};

export default function CreateUser({
  showCreateUserForm,
  setShowCreateUserForm,
  handleInviteUser,
  queryInvalidation,
}: CreateUserProps) {
  const [selectedMarketCenterId, setSelectedMarketCenterId] = useState("");
  const [newUserFormData, setNewUserFormData] = useState<CreateClerkUserForm>({
    firstName: "",
    lastName: "",
    email: "",
    role: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { user: clerkUser } = useUser();

  const { role, permissions } = useUserRole();

  const { data, isLoading } = useFetchAllMarketCenters(role);

  const marketCenters: MarketCenter[] = data?.marketCenters ?? [];
  const getRoleIcon = (role: string) => {
    const Icon = ROLE_ICONS[role as keyof typeof ROLE_ICONS] || User;
    return <Icon className="h-4 w-4" />;
  };

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

  const createClerkUser = async () => {
    try {
      const response = await fetch("/api/clerk/create-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "Access-Control-Allow-Origin",
        },

        body: JSON.stringify({
          email: [newUserFormData?.email],
          firstName: newUserFormData.firstName,
          lastName: newUserFormData.lastName,
          role: newUserFormData.role,
          marketCenterId: selectedMarketCenterId ?? null,
        }),
      });
      if (response?.status === 422) {
        toast.error("A user with that email already exists");
        throw new Error("Unprocessable Entity");
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Unable to create Clerk User", error);
      return null;
    }
  };

  const createNewPrismaUser = async (clerkId?: string) => {
    if (!clerkId) {
      throw new Error("Missing Clerk Id");
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
          clerkId: clerkId,
          marketCenterId:
            selectedMarketCenterId !== "null" ? selectedMarketCenterId : "",
        }),
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Failed to create prisma user", error);
      return null;
    }
  };

  const createUserMutation = useMutation({
    mutationFn: async () => {
      const newClerkUser = await createClerkUser();
      if (!newClerkUser || !newClerkUser?.id) {
        throw new Error("Failed to create Clerk User");
      }
      const newPrismaUser = await createNewPrismaUser(newClerkUser.id);
      if (!newPrismaUser) {
        throw new Error(
          "Clerk user created, but failed to create new Prisma User"
        );
      }
    },
    onSuccess: async (newPrismaUser: any) => {
      if (handleInviteUser) {
        toast.success(
          `${newPrismaUser?.name || "User"} added! Sending invitation now...`
        );
        // await handleInviteUser(newPrismaUser);
      } else {
        toast.success(`${newPrismaUser?.name || "User"} added!`);
      }
      setShowCreateUserForm(false);
      setFormErrors({});
    },
    onError: (error) => {
      console.error("Failed to create new user: ", error);
      toast.error("Failed to create new user");
    },
    onSettled: async () => {
      await queryInvalidation();
      setIsSubmitting(false);
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
