"use client";

import type React from "react";
import { useCallback, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useStore } from "@/context/store-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { StarRating } from "@/components/ui/ratingInput/star-rating-static";
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
  ConductorUser,
  UserEditFormData,
  UserNotificationCallback,
  UserRole,
} from "@/lib/types";
import { getRoleDescription, ROLE_ICONS, roleOptions } from "@/lib/utils";
import {
  ArrowLeft,
  Building,
  Edit2,
  Hash,
  InfoIcon,
  Mail,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useFetchRatingsByAssignee } from "@/hooks/use-tickets";
import { useFetchAllMarketCenters } from "@/hooks/use-market-center";
import { useFetchOneUser } from "@/hooks/use-users";
import { createAndSendNotification } from "@/lib/utils/notifications";
import { useIsEnterprise, useSubscription } from "@/hooks/useSubscription";

type UserDetailViewProps = { id: string };

export default function UserDetailView({ id }: UserDetailViewProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  const { data: userData, isLoading: userLoading } = useFetchOneUser({
    id: id,
  });
  const user: ConductorUser = useMemo(() => userData?.user ?? {}, [userData]);
  const marketCenter: MarketCenter = useMemo(
    () => user?.marketCenter ?? ({} as MarketCenter),
    [user]
  );

  // EDIT USER STATES
  const [showEditUserForm, setShowEditUserForm] = useState(false);
  const [formData, setFormData] = useState<UserEditFormData>({
    firstName: "",
    lastName: "",
    email: "",
    role: user?.role ?? "AGENT",
    marketCenterId: user?.marketCenterId ?? "Unassigned",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { isEnterprise } = useIsEnterprise();
  const { currentUser, setCurrentUser } = useStore();
  const { role, permissions } = useUserRole();

  const { data: subscription, isLoading: isSubscriptionLoading } =
    useSubscription();

  const seats = useMemo(() => {
    const activeSubscription =
      (subscription && subscription?.status === "ACTIVE") ||
      subscription?.status === "TRIALING";
    const totalSeats = activeSubscription ? subscription.totalSeats : 0;
    const filledSeats = activeSubscription ? subscription.usedSeats : 0;
    const hasAvailableSeats = filledSeats < totalSeats;
    return { activeSubscription, totalSeats, filledSeats, hasAvailableSeats };
  }, [subscription]);

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
  const userNameForm = useMemo(
    () => `${formData?.firstName.trim()} ${formData?.lastName.trim()}`,
    [formData]
  );

  const updates = useMemo(() => {
    const hasNameChanged: boolean = user && userNameForm !== user?.name;
    const hasEmailChanged: boolean = formData?.email !== user?.email;
    const hasRoleChanged: boolean = formData?.role !== user?.role;

    const formMarketCenterId =
      !formData?.marketCenterId || formData?.marketCenterId === "Unassigned"
        ? null
        : formData?.marketCenterId;
    const hasMarketCenterChanged: boolean =
      formMarketCenterId !== user?.marketCenterId;
    const userUpdatesMade =
      hasNameChanged ||
      hasEmailChanged ||
      hasRoleChanged ||
      hasMarketCenterChanged;

    return {
      hasNameChanged,
      hasEmailChanged,
      hasRoleChanged,
      hasMarketCenterChanged,
      userUpdatesMade,
    };
  }, [userNameForm, formData, user]);

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData?.firstName || !formData?.firstName.trim())
      errors.name = "First name is required";
    if (!formData?.lastName || !formData?.lastName.trim())
      errors.lastName = "Last name is required";

    if (!formData?.email || !formData?.email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData?.email)) {
      errors.email = "Invalid email format";
    }

    if (!formData?.role) errors.role = "Role is required";

    if (!updates.userUpdatesMade)
      errors.general = "Please update at least one field to continue";

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSendUserNotifications = useCallback(
    async ({ trigger, receivingUser, data }: UserNotificationCallback) => {
      try {
        const response = await createAndSendNotification({
          getToken: getToken,
          templateName: "Account Information",
          trigger: trigger,
          receivingUser: receivingUser,
          data: data,
        });
      } catch (error) {
        // Notification failed silently
        console.error("Failed handleSendUserNotifications():", error);
      }
    },
    [getToken]
  );
  const updateUserMutation = useMutation<
    ConductorUser,
    Error,
    { userId: string; quickEdit: boolean }
  >({
    mutationFn: async ({ userId, quickEdit }) => {
      if (!userId) throw new Error("Missing User ID");

      const token = await getToken();
      if (!token) {
        throw new Error("Failed to get authentication token");
      }
      let body: any = {};
      if (quickEdit) {
        body.role = formData.role;
        body.marketCenterId = user?.marketCenterId ?? null;
      } else {
        body = formData;
      }

      if (!body) throw new Error("Nothing to update");
      const response = await fetch(`${API_BASE}/users/${userId}/update`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData?.message && typeof errorData.message === "string") {
          toast.error(`Error: ${errorData.message}`);
          setFormErrors({ general: errorData.message });
          throw new Error(errorData.message);
        }
        throw new Error("Failed to update user");
      }

      const data = await response.json();
      if (!data || !data?.user) {
        throw new Error("Updated data was not found");
      }

      return data.user as ConductorUser;
    },
    onSuccess: async (data: ConductorUser) => {
      toast.success(`${data?.name || "User"} was updated`);
      if (currentUser?.id === data?.id) {
        setCurrentUser(data);
      }
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
              updates?.hasNameChanged && {
                value: "name",
                originalValue: user?.name ?? null,
                newValue: data?.name ?? null,
              },
              updates?.hasEmailChanged && {
                value: "email",
                originalValue: user?.email ?? null,
                newValue: data?.email ?? null,
              },
              updates?.hasRoleChanged && {
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
    onError: () => {
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
    setFormErrors({});

    if (!permissions?.canManageTeam) {
      toast.error("You do not have permission to update users");
      return;
    }
    if (!validateForm()) return;
    setIsSubmitting(true);
    updateUserMutation.mutate({
      userId: user?.id,
      quickEdit: false,
    });
  };

  const handleRoleChange = async () => {
    setFormErrors({});
    if (!permissions?.canManageTeam) {
      toast.error("You do not have permission to update users");
      return;
    }
    setIsSubmitting(true);

    updateUserMutation.mutate({
      userId: user?.id,
      quickEdit: true,
    });
  };

  const { data: userRatingsData } = useFetchRatingsByAssignee(
    ["user-profile-ratings-by-assignee", user?.id],
    (userData?.resolvedTicketsCount ?? 0) > 0,
    user?.id
  );

  const { data: marketCentersData, isLoading: isMarketCentersLoading } =
    useFetchAllMarketCenters(showEditUserForm ? role : undefined);
  const marketCenters: MarketCenter[] = useMemo(
    () => marketCentersData?.marketCenters || [],
    [marketCentersData]
  );

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
              marketCenterId: user?.marketCenterId ?? "Unassigned",
            });
          }}
          className="gap-2"
        >
          <Edit2 className="h-4 w-4" /> Edit User
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3 lg:grid-rows-[auto_1fr] justify-center">
        {/* USER INFO */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-xl flex items-center justify-between gap-2">
              {user?.name}
              <ToolTip
                content="Ratings are based on assigned and resolved tickets via survey responses"
                trigger={<InfoIcon className="size-3.5 text-primary" />}
              />
            </CardTitle>
            <div className="flex flex-wrap gap-4 items-center text-sm text-muted-foreground font-medium">
              <span className="flex items-center gap-1">
                Avg User Rating:
                <StarRating
                  rating={userRatingsData?.assigneeAverageRating ?? 0}
                  size={16}
                />
              </span>
              <span className="flex items-center gap-2 text-sm">
                Avg Ticket Rating:
                <StarRating
                  rating={userRatingsData?.overallAverageRating ?? 0}
                  size={16}
                />
              </span>
              <span className="flex items-center gap-2 text-sm">
                Avg Market Center Rating:
                <StarRating
                  rating={userRatingsData?.marketCenterAverageRating ?? 0}
                  size={16}
                />
              </span>
            </div>
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
                  {getRoleIcon(user?.role ?? "AGENT")}
                  <p className="text-muted-foreground">Role:</p>
                  <ToolTip
                    trigger={
                      <Badge
                        variant={
                          (user?.role ? user.role.toLowerCase() : "user") as any
                        }
                        className="text-xs px-2 py-0.5"
                      >
                        {user?.role ? user?.role.split("_").join(" ") : "N/a"}
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
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <Label className="text-sm font-medium">Role *</Label>
                <ToolTip
                  content={
                    !!isEnterprise ||
                    (!isEnterprise && seats?.hasAvailableSeats)
                      ? "You have available seats. All roles can be assigned."
                      : "Upgrade your subscription to assign the admin, staff leader or staff role."
                  }
                  trigger={
                    <p className="text-xs text-muted-foreground">
                      {!!isEnterprise
                        ? "Unlimited seats"
                        : `${seats.filledSeats} out of ${seats.totalSeats} paid seats
                    used`}
                    </p>
                  }
                />
              </div>
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
                  userLoading ||
                  isSubscriptionLoading
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((option: UserRole) => {
                    if (
                      (!isEnterprise &&
                        !seats?.hasAvailableSeats &&
                        role !== "AGENT") ||
                      ((role === "STAFF" || role === "STAFF_LEADER") &&
                        option === "ADMIN")
                    )
                      return null;

                    return (
                      <SelectItem key={option} value={option}>
                        <div className="flex items-center gap-2">
                          {getRoleIcon(option ?? "AGENT")}
                          {option
                            ? option.split("_").join(" ")
                            : "Role not assigned"}
                        </div>
                      </SelectItem>
                    );
                  })}
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
                disabled={isSubmitting || userLoading}
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
                disabled={isSubmitting || userLoading}
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
                disabled={isSubmitting || userLoading}
              />
              <p className="text-sm text-destructive">
                {formErrors?.email && formErrors.email}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <Label className="text-sm font-medium">Role *</Label>
                <ToolTip
                  content={
                    !!isEnterprise ||
                    (!isEnterprise && seats?.hasAvailableSeats)
                      ? "You have available seats. All roles can be assigned."
                      : "Upgrade your subscription to assign the admin, staff leader or staff role."
                  }
                  trigger={
                    <p className="text-xs text-muted-foreground">
                      {!!isEnterprise
                        ? "Unlimited seats"
                        : `${seats.filledSeats} out of ${seats.totalSeats} paid seats
                    used`}
                    </p>
                  }
                />
              </div>
              <Select
                value={formData.role}
                onValueChange={(value: UserRole) =>
                  setFormData({ ...formData, role: value })
                }
                disabled={
                  currentUser?.id === user?.id ||
                  !permissions?.canChangeUserRoles ||
                  isSubmitting ||
                  userLoading ||
                  isSubscriptionLoading
                }
              >
                <SelectTrigger
                  className={`${formErrors?.role ? "border-destructive" : ""}`}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((option: UserRole) => {
                    if (
                      (!isEnterprise &&
                        !seats?.hasAvailableSeats &&
                        role !== "AGENT") ||
                      ((role === "STAFF" || role === "STAFF_LEADER") &&
                        option === "ADMIN")
                    )
                      return null;
                    return (
                      <SelectItem key={option} value={option}>
                        {getRoleIcon(option)}
                        {option ? option.split("_").join(" ") : "N/A"}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <p className="text-sm text-destructive">
                {formErrors?.role && formErrors.role}
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Market Center</Label>
              <Select
                value={formData.marketCenterId}
                onValueChange={(value) =>
                  setFormData({ ...formData, marketCenterId: value })
                }
                disabled={
                  !role ||
                  role === "AGENT" ||
                  isSubmitting ||
                  userLoading ||
                  isMarketCentersLoading
                }
              >
                <SelectTrigger
                  className={`${
                    formErrors?.marketCenter ? "border-destructive" : ""
                  }`}
                >
                  <SelectValue
                    placeholder={
                      isMarketCentersLoading
                        ? "Loading market centers..."
                        : "Select a market center"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={"Unassigned"}>
                    <div className="flex items-center gap-2">Unassigned</div>
                  </SelectItem>
                  {!isMarketCentersLoading &&
                    marketCenters &&
                    marketCenters.map((mc: MarketCenter) => {
                      if (!mc || !mc?.id) return null;
                      return (
                        <SelectItem key={mc.id} value={mc.id}>
                          {mc?.name
                            ? mc.name
                            : `Name not found: #${mc.id.slice(0, 8)}`}
                        </SelectItem>
                      );
                    })}
                </SelectContent>
              </Select>

              <p className="text-sm text-destructive">
                {formErrors?.marketCenter && formErrors.marketCenter}
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              {formErrors?.general && (
                <p className="text-sm text-destructive">{formErrors.general}</p>
              )}
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
                disabled={isSubmitting || !user || userLoading}
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
