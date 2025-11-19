"use client";

import type React from "react";
import { useCallback, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useStore } from "@/context/store-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog/base-dialog";
import UserHistoryTable from "@/components/history-tables/user/history-table-user";
import UserTicketHistoryTable from "@/components/history-tables/user/history-table-user-tickets";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToolTip } from "@/components/ui/tooltip/tooltip";
import { useUserRole } from "@/hooks/use-user-role";
import { API_BASE } from "@/lib/api/utils";
import {
  MarketCenter,
  PrismaUser,
  UserEditFormData,
  UserNotificationCallback,
  UserRole,
} from "@/lib/types";
import {
  getRoleBadgeStyle,
  getRoleColor,
  getRoleDescription,
  ROLE_ICONS,
  roleOptions,
} from "@/lib/utils";
import { ArrowLeft, Building, Edit2, Hash, Mail, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useFetchOneUser } from "@/hooks/use-users";
import { createAndSendNotification } from "@/lib/utils/notifications";

type UserDetailViewProps = { id: string };

export default function UserDetailView({ id }: UserDetailViewProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  const { data: userData, isLoading: userLoading } = useFetchOneUser({
    id: id,
  });
  const user: PrismaUser = userData ?? {};
  const marketCenter: MarketCenter = user?.marketCenter ?? ({} as MarketCenter);

  // EDIT USER STATES
  const [showEditUserForm, setShowEditUserForm] = useState(false);
  const [formData, setFormData] = useState<UserEditFormData>({
    firstName: "",
    lastName: "",
    email: "",
    role: user?.role ?? "AGENT",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { currentUser } = useStore();
  const { role, permissions } = useUserRole();

  const getRoleIcon = (userRole: UserRole) => {
    const Icon = ROLE_ICONS[userRole as keyof typeof ROLE_ICONS];
    return Icon ? (
      <Icon className="h-4 w-4 text-muted-foreground" />
    ) : (
      <User className="h-4 w-4 text-muted-foreground" />
    );
  };

  const resetFormAndClose = () => {
    setFormErrors({});
    setShowEditUserForm(false);
  };
  const userNameForm = `${formData?.firstName.trim()} ${formData?.lastName.trim()}`;
  const hasNameChanged: boolean = user && userNameForm !== user?.name;
  const hasEmailChanged: boolean = formData?.email !== user?.email;
  const hasRoleChanged: boolean = formData?.role !== user?.role;

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData?.firstName || !formData?.firstName.trim())
      errors.name = "First name is required";
    if (!formData?.lastName || !formData?.lastName.trim())
      errors.lastName = "Last name is required";

    // if (!formData?.email.trim()) {
    //   errors.email = "Email is required";
    // } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData?.email)) {
    //   errors.email = "Invalid email format";
    // }

    if (!formData?.role) errors.role = "Role is required";

    if (!hasNameChanged && !hasEmailChanged && !hasRoleChanged)
      errors.general = "No changes made";

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const updateUserInPrisma = async (userId: string, quickEdit: boolean) => {
    let body: any = {};
    if (quickEdit) {
      body.role = formData.role;
    } else {
      body.name = `${formData.firstName} ${formData.lastName}`;
      // body.email = formData.email;
      body.role = formData.role;
      body.marketCenterId = formData?.marketCenterId;
    }
    if (!body) throw new Error("Nothing to update");
    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Failed to get authentication token");
      }
      const response = await fetch(`${API_BASE}/users/${userId}/update`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      return response;
    } catch (error) {
      console.error("Prisma - Failed to update user", error);
      return null;
    }
  };
  const updateUserInClerk = async (clerkId: string) => {
    if (!clerkId) {
      throw new Error("Not authorized to update this profile");
    }

    try {
      const response = await fetch(`/api/clerk/update-user`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clerkId: clerkId,
          first_name: formData.firstName,
          last_name: formData.lastName,
        }),
      });

      if (!response || !response.ok) throw new Error("Response not okay");
      const data = await response.json();
      if (!data) throw new Error("No data from Clerk");
      return true;
    } catch (error) {
      console.error("CLERK - Failed to update user", error);
      return false;
    }
  };

  const handleSendUserNotifications = useCallback(
    async ({ trigger, receivingUser, data }: UserNotificationCallback) => {
      try {
        const token = await getToken();
        if (!token) {
          throw new Error("Failed to get authentication token");
        }
        const response = await createAndSendNotification({
          authToken: token,
          trigger: trigger,
          receivingUser: receivingUser,
          data: data,
        });
      } catch (error) {
        console.error(
          "UserDetailView - Unable to generate notifications",
          error
        );
      }
    },
    [getToken]
  );
  const updateUserMutation = useMutation<
    PrismaUser,
    Error,
    { userId: string; clerkId: string; quickEdit: boolean }
  >({
    mutationFn: async ({ userId, clerkId, quickEdit }) => {
      if (!userId || !clerkId) throw new Error("Missing User ID");

      // TODO: Separate Clerk endpoints for email updates
      const clerkResponse = await updateUserInClerk(clerkId);
      if (!clerkResponse) {
        throw new Error("Clerk Error");
      }
      const prismaResponse = await updateUserInPrisma(userId, quickEdit);
      if (!prismaResponse) {
        throw new Error("Prisma Error");
      }
      const data = await prismaResponse.json();
      if (!data || !data?.user) {
        throw new Error("Prisma - Updated data was not found");
      }

      return data.user as PrismaUser;
    },
    onSuccess: async (data: PrismaUser) => {
      toast.success(`${data?.name || "User"} was updated`);
      const token = await getToken();
      if (!token) {
        throw new Error("Failed to get authentication token");
      }
      await handleSendUserNotifications({
        trigger: "Account Information",
        receivingUser: {
          id: data?.id,
          name: data?.name ?? data?.email,
          email: data.email,
        },
        data: {
          accountInformation: {
            changedByName:
              currentUser?.id === data?.id
                ? "You"
                : currentUser && currentUser?.name
                  ? currentUser.name
                  : "Another user",
            changedByEmail: currentUser?.email,
            updates: [
              hasNameChanged && {
                value: "name",
                originalValue: user?.name ?? null,
                newValue: data?.name ?? null,
              },
              hasEmailChanged && {
                value: "email",
                originalValue: user?.email ?? null,
                newValue: data?.email ?? null,
              },
              hasRoleChanged && {
                value: "role",
                originalValue: user?.role ?? null,
                newValue: data?.role ?? "AGENT",
              },
            ].filter(Boolean) as {
              value: "name" | "email" | "role" | "password";
              originalValue: string | null;
              newValue: string | null;
            }[],
          },
        },
      });
      resetFormAndClose();
    },
    onError: (error: any) => {
      console.error("Failed to update user", error);
      toast.error("Failed to update user");
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["user-profile", id],
      });
      setIsSubmitting(false);
    },
  });

  const handleSubmitEditUserForm = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!permissions?.canManageTeam) {
      toast.error("You do not have permission to update users");
      return;
    }
    if (!validateForm()) return;
    setIsSubmitting(true);
    updateUserMutation.mutate({
      userId: user?.id,
      clerkId: user?.clerkId,
      quickEdit: false,
    });
  };

  const handleRoleChange = async () => {
    if (!permissions?.canManageTeam) {
      toast.error("You do not have permission to update users");
      return;
    }
    updateUserMutation.mutate({
      userId: user?.id,
      clerkId: user?.clerkId,
      quickEdit: true,
    });
  };

  return (
    <div className="space-y-6">
      {/* TOP INFO */}
      <div className="flex items-center gap-2 justify-between">
        <Button variant="ghost" onClick={() => router.back()} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setShowEditUserForm(true);
            setFormData({
              firstName: user && user?.name ? user?.name.split(" ")?.[0] : "",
              lastName: user && user?.name ? user?.name.split(" ")?.[1] : "",
              email: user?.email ?? "",
              role: user?.role ?? "AGENT",
            });
          }}
          className="gap-2"
        >
          <Edit2 className="h-4 w-4" /> Edit User
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3 lg:grid-rows-[auto_1fr] justify-center">
        {/* USER INFO */}
        <Card className="lg:col-span-2 ">
          <CardHeader>
            <CardTitle className="text-xl">{user?.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Email:</p>
                  <p className="font-medium">{user?.email}</p>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Market Center:</p>
                  <p className="font-medium">
                    {marketCenter?.name ?? "Not Assigned"}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  <p className="text-muted-foreground">User ID:</p>
                  <p className="font-medium">
                    {user?.id ? `${user?.id.slice(0, 8)}` : "Not found"}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  {getRoleIcon(user?.role)}
                  <p className="text-muted-foreground">Role:</p>
                  <ToolTip
                    trigger={
                      <Badge
                        variant={getRoleColor(user?.role || "AGENT")}
                        style={getRoleBadgeStyle(user?.role || "AGENT")}
                        title={user?.role}
                        className="text-xs px-2 py-0.5"
                      >
                        {user?.role}
                      </Badge>
                    }
                    content={getRoleDescription(user?.role)}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        {/* QUICK EDITS */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Quick Edit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Role *</Label>
              <Select
                value={user?.role}
                onValueChange={(value: UserRole) => {
                  setFormData({
                    firstName:
                      user && user?.name ? user?.name.split(" ")?.[0] : "",
                    lastName:
                      user && user?.name ? user?.name.split(" ")?.[1] : "",
                    email: user?.email ?? "",
                    role: value,
                  });
                  handleRoleChange();
                }}
                disabled={
                  currentUser?.id === user?.id ||
                  !permissions?.canChangeUserRoles ||
                  isSubmitting ||
                  userLoading
                }
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
          </CardContent>
        </Card>

        {/* USER ACTIVITY */}
        <section className="lg:col-span-3">
          <div className="flex flex-row items-center justify-between">
            <p className="text-lg font-bold">Recent Activity</p>
          </div>
          <div className="space-y-10">
            <p className="text-md font-bold m-4 ml-2">Users</p>
            <UserHistoryTable userId={user?.id} />
            <p className="text-md font-bold m-4 ml-2">Tickets</p>
            <UserTicketHistoryTable
              userId={user?.id}
              username={user?.name ?? ""}
            />
          </div>
        </section>
      </div>

      {/* EDIT USER */}
      <Dialog open={showEditUserForm} onOpenChange={setShowEditUserForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitEditUserForm} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-sm font-medium">
                First Name *
              </Label>
              <Input
                id="firstName"
                value={formData?.firstName}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    firstName: e.target.value,
                  })
                }
                placeholder="Enter first name"
                className={formErrors.firstName ? "border-destructive" : ""}
              />

              <p className="text-sm text-destructive">
                {formErrors?.firstName && formErrors.firstName}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-sm font-medium">
                Last Name *
              </Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    lastName: e.target.value,
                  })
                }
                placeholder="Enter last name"
                className={formErrors.lastName ? "border-destructive" : ""}
              />
              <p className="text-sm text-destructive">
                {formErrors?.lastName && formErrors.lastName}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email Address *
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    email: e.target.value,
                  })
                }
                placeholder="Enter email address"
                className={formErrors.email ? "border-destructive" : ""}
                disabled // TODO: CLERK EMAIL API ROUTES
              />
              <p className="text-sm text-destructive">
                {formErrors?.email && formErrors.email}
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Role *</Label>
              <Select
                value={formData.role}
                onValueChange={(value: UserRole) =>
                  setFormData({ ...formData, role: value })
                }
                disabled={!role || role === "AGENT"}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((option: UserRole) => {
                    if (
                      (role === "STAFF" || role === "STAFF_LEADER") &&
                      option === "ADMIN"
                    )
                      return null;
                    return (
                      <SelectItem key={option} value={option}>
                        <div className="flex items-center gap-2">
                          {getRoleIcon(option)}
                          {option}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <p className="text-sm text-destructive">
                {formErrors?.general && formErrors.general}
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEditUserForm(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  isSubmitting ||
                  !user ||
                  (!hasNameChanged && !hasEmailChanged && !hasRoleChanged)
                }
              >
                {isSubmitting ? "Saving..." : "Update User"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
