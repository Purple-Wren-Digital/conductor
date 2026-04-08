"use client";

import type React from "react";
import { useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog/base-dialog";
import { Input } from "@/components/ui/input";
import { ToolTip } from "@/components/ui/tooltip/tooltip";
import UserMultiSelectDropdown from "@/components/ui/multi-select/user-multi-select-dropdown";
import { useStore } from "@/context/store-provider";
import { useFetchMarketCenterUsers } from "@/hooks/use-market-center";
import { useIsEnterprise, useSubscription } from "@/hooks/useSubscription";
import { useUserRole } from "@/hooks/use-user-role";
import { API_BASE } from "@/lib/api/utils";
import type {
  MarketCenter,
  MarketCenterForm,
  MarketCenterNotificationCallback,
  PrismaUser,
  UsersToNotify,
} from "@/lib/types";
import { arraysEqualById } from "@/lib/utils";
import { createAndSendNotification } from "@/lib/utils/notifications";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";

type EditMarketCenterProps = {
  editingMarketCenter: MarketCenter | null;
  setEditingMarketCenter?: React.Dispatch<
    React.SetStateAction<MarketCenter | null>
  >;
  showEditMCForm: boolean;
  setShowEditMCForm: React.Dispatch<React.SetStateAction<boolean>>;
  formData: MarketCenterForm;
  setFormData: React.Dispatch<React.SetStateAction<MarketCenterForm>>;
  refreshMarketCenters: () => Promise<void>;
};

export default function EditMarketCenter({
  editingMarketCenter,
  setEditingMarketCenter,
  showEditMCForm,
  setShowEditMCForm,
  formData,
  setFormData,
  refreshMarketCenters,
}: EditMarketCenterProps) {
  const [availableSeats, setAvailableSeats] = useState<number>(0);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { getToken } = useAuth();
  const { permissions, isSuperuser } = useUserRole();
  const { currentUser } = useStore();
  const { isEnterprise } = useIsEnterprise();
  const canBypassLimits = isEnterprise || isSuperuser;

  const assignedUsers: PrismaUser[] = useMemo(() => {
    return editingMarketCenter?.users ?? [];
  }, [editingMarketCenter]);

  const { data: subscription, isLoading: isSubscriptionLoading } =
    useSubscription();

  const seats = useMemo(() => {
    const activeSubscription =
      (subscription && subscription?.status === "ACTIVE") ||
      subscription?.status === "TRIALING";
    const totalSeats = activeSubscription ? subscription.totalSeats : 0;
    const filledSeats = activeSubscription ? subscription.usedSeats : 0;
    const hasAvailableSeats = filledSeats < totalSeats;

    setAvailableSeats(totalSeats - filledSeats);

    return { activeSubscription, totalSeats, filledSeats, hasAvailableSeats };
  }, [subscription]);

  const unassignedUsersQueryParams = useMemo(() => {
    const params = new URLSearchParams();
    params.append("marketCenterId", "Unassigned");
    if (!canBypassLimits && !seats?.hasAvailableSeats) {
      params.append("role", "AGENT");
    }
    return params;
  }, [canBypassLimits, seats]);

  const unassignedUsersQueryKeyParams = useMemo(
    () =>
      Object.fromEntries(unassignedUsersQueryParams.entries()) as Record<
        string,
        string
      >,
    [unassignedUsersQueryParams]
  );

  const {
    data: unassignedUsersData,
    isLoading: unassignedUsersLoading,
    refetch: refetchUnassignedUsers,
  } = useFetchMarketCenterUsers({
    queryKey: [
      "edit-market-center-unassigned-users",
      "Unassigned",
      unassignedUsersQueryKeyParams,
    ],
    queryKeyParams: unassignedUsersQueryKeyParams,
    marketCenterId: "Unassigned",
  });

  const unassignedUsers: PrismaUser[] = useMemo(() => {
    let unAssigned = unassignedUsersData?.users ?? [];
    if (!canBypassLimits && !seats?.hasAvailableSeats) {
      unAssigned =
        unAssigned && unAssigned.length > 0
          ? unAssigned.filter((user: PrismaUser) => user.role === "AGENT")
          : [];
    }
    return unAssigned;
  }, [unassignedUsersData, canBypassLimits, seats]);

  const handleSetSelectedOptions = (newSelected: PrismaUser[]) => {
    setFormData({
      ...formData,
      selectedUsers: newSelected,
    });
  };

  const resetAndCloseForm = () => {
    setFormData({
      name: "",
      selectedUsers: [],
    });
    setFormErrors({});
    setShowEditMCForm(false);
    if (setEditingMarketCenter) setEditingMarketCenter(null);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (
      formData?.name.trim() === editingMarketCenter?.name.trim() &&
      arraysEqualById(assignedUsers, formData.selectedUsers)
    ) {
      errors.general = "Please update at least one field to continue";
    }

    if (!formData?.name || !formData.name.trim()) {
      errors.name = "Name is required";
    }

    if (!canBypassLimits && formData.selectedUsers.length > 0) {
      const selectedNonAgents = formData.selectedUsers.filter(
        (user) => user.role !== "AGENT"
      );
      const selectedUsersExceedSeats =
        !canBypassLimits && selectedNonAgents.length > seats.totalSeats;

      if (selectedUsersExceedSeats) {
        errors.users = `Please upgrade your subscription to add more than ${seats.totalSeats} admin and staff users`;
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSendMarketCenterNotifications = async ({
    templateName,
    trigger,
    receivingUser,
    data,
  }: MarketCenterNotificationCallback) => {
    try {
      const response = await createAndSendNotification({
        getToken: getToken,
        templateName: templateName,
        trigger: trigger,
        receivingUser: receivingUser,
        data: data,
      });
    } catch {
      // Notification failed silently
    }
  };

  const updateMarketCenterMutation = useMutation({
    mutationFn: async () => {
      if (!editingMarketCenter?.id) throw new Error("Missing market center id");
      const token = await getToken();
      if (!token) throw new Error("Failed to get authentication token");
      const response = await fetch(
        `${API_BASE}/marketCenters/${editingMarketCenter?.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: formData.name,
            users: formData.selectedUsers,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error(
          `Edit Market Center - ${response.status} RESPONSE:`,
          errorData
        );
        throw new Error(
          errorData?.message
            ? errorData.message
            : "Failed to create market center"
        );
      }
      const data = await response.json();
      return data;
    },
    onSuccess: async (data: {
      marketCenter: MarketCenter;
      usersToNotify: UsersToNotify[];
    }) => {
      toast.success(
        `${data?.marketCenter?.name ? data.marketCenter.name : "Market Center"} was updated`
      );

      if (data?.usersToNotify && data?.usersToNotify.length > 0) {
        await Promise.all(
          data.usersToNotify.map(
            async (user) =>
              await handleSendMarketCenterNotifications({
                templateName: "Market Center Assignment",
                trigger: "Market Center Assignment",
                receivingUser: {
                  id: user.id,
                  name: user.name ?? "You",
                  email: user.email,
                },
                data: {
                  marketCenterAssignment: {
                    userUpdate: user.updateType,
                    marketCenterId: editingMarketCenter?.id,
                    marketCenterName: data.marketCenter?.name,
                    userName: user.name ?? user.email,
                    editorEmail: currentUser?.email ?? "N/A",
                    editorName: currentUser?.name ?? "Another user",
                  },
                },
              })
          )
        );
      }
      setIsSubmitting(false);
      resetAndCloseForm();
    },
    onError: () => {
      toast.error(`Error: Unable to save changes`);
    },
    onSettled: async () => {
      await refetchUnassignedUsers();
      await refreshMarketCenters();
      setIsSubmitting(false);
    },
  });

  const handleUpdateMarketCenter = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const canStaffUpdate =
      permissions?.canManageAllMarketCenters ||
      (permissions?.canManageTeam &&
        currentUser?.marketCenterId === editingMarketCenter?.id);

    if (!canStaffUpdate) {
      toast.warning("You do not have permission to update this market center");
      setIsSubmitting(false);
      return;
    }
    if (!validateForm()) {
      toast.error("Invalid form input(s)");
      setIsSubmitting(false);
      return;
    }
    updateMarketCenterMutation.mutate();
  };

  return (
    <Dialog open={showEditMCForm} onOpenChange={setShowEditMCForm}>
      <DialogClose onClick={() => resetAndCloseForm()} />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Editing Market Center #{editingMarketCenter?.id.slice(0, 8)}
          </DialogTitle>
        </DialogHeader>

        <form className="space-y-3" onSubmit={handleUpdateMarketCenter}>
          {/* NAME */}
          <div className="space-y-2">
            <label htmlFor="name" className="text-md font-medium">
              Market Center Name *
            </label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  name: e.target.value,
                })
              }
              placeholder="Enter Name"
              className={`mt-1 ${formErrors.name && "border-destructive"}`}
            />
            <p className="text-sm text-destructive">
              {formErrors?.name && formErrors.name}
            </p>
          </div>

          {/* USERS */}
          <div className="space-y-2 space-x-2 w-full">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <label className="text-md font-medium">Team Assignments</label>
              <ToolTip
                content={
                  !!canBypassLimits ||
                  (!canBypassLimits && seats?.hasAvailableSeats) ||
                  (!canBypassLimits && availableSeats === seats.totalSeats)
                    ? "You have available seats. All roles can be assigned."
                    : "Upgrade your subscription to assign the admin, staff leader or staff role."
                }
                trigger={
                  <p className="text-xs text-muted-foreground">
                    {canBypassLimits
                      ? "Unlimited seats"
                      : `${seats.filledSeats} out of ${seats.totalSeats} paid seats
                    used`}
                  </p>
                }
              />
            </div>
            <div className="space-y-2 space-x-2 w-full">
              {formData.selectedUsers &&
                formData.selectedUsers.length > 0 &&
                formData.selectedUsers.map((selectedUser, index) => {
                  return (
                    <Badge key={index} variant="secondary">
                      <p className="text-md">{selectedUser.name}</p>
                    </Badge>
                  );
                })}
            </div>

            <UserMultiSelectDropdown
              type="editing"
              filter={true}
              disabled={
                isSubscriptionLoading ||
                unassignedUsersLoading ||
                ((!assignedUsers || !assignedUsers.length) &&
                  (!unassignedUsers || !unassignedUsers.length))
              }
              marketCenterId={editingMarketCenter?.id || null}
              placeholder={
                isSubscriptionLoading || unassignedUsersLoading
                  ? "Loading users..."
                  : formData.selectedUsers && formData.selectedUsers.length
                    ? `${formData.selectedUsers.length} users selected`
                    : (assignedUsers && assignedUsers.length > 0) ||
                        (unassignedUsers && unassignedUsers.length > 0)
                      ? "Add or remove users"
                      : "No available users found"
              }
              formFieldName="Users"
              options={[...assignedUsers, ...unassignedUsers]}
              selectedOptions={formData.selectedUsers}
              handleSetSelectedOptions={handleSetSelectedOptions}
              error={formErrors?.users ? formErrors.users : null}
            />
            <p className="text-sm text-destructive">
              {formErrors?.users && formErrors.users}
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <p className="text-sm text-destructive">
              {formErrors?.general && formErrors.general}
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetAndCloseForm();
                setShowEditMCForm(false);
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Submit"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
