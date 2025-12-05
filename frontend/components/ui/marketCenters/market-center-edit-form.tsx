"use client";

import type React from "react";
import { useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
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
import { API_BASE } from "@/lib/api/utils";
import { useUserRole } from "@/hooks/use-user-role";
import type {
  MarketCenter,
  MarketCenterForm,
  MarketCenterNotificationCallback,
  PrismaUser,
  UsersToNotify,
} from "@/lib/types";
import { toast } from "sonner";

import UserMultiSelectDropdown from "../multi-select/user-multi-select-dropdown";
// import { arraysEqualById } from "@/lib/utils";
import { useMutation } from "@tanstack/react-query";
import { useStore } from "@/context/store-provider";
import { createAndSendNotification } from "@/lib/utils/notifications";

type EditMarketCenterProps = {
  editingMarketCenter: MarketCenter | null;
  setEditingMarketCenter?: React.Dispatch<
    React.SetStateAction<MarketCenter | null>
  >;
  showEditMCForm: boolean;
  setShowEditMCForm: React.Dispatch<React.SetStateAction<boolean>>;
  assignedUsers: PrismaUser[];
  unassignedUsers: PrismaUser[];
  formData: MarketCenterForm;
  setFormData: React.Dispatch<React.SetStateAction<MarketCenterForm>>;
  refreshMarketCenters: () => void;
  refreshUsers: () => void;
};

export default function EditMarketCenter({
  editingMarketCenter,
  setEditingMarketCenter,
  showEditMCForm,
  setShowEditMCForm,
  assignedUsers,
  unassignedUsers,
  formData,
  setFormData,
  refreshMarketCenters,
  refreshUsers,
}: EditMarketCenterProps) {
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { getToken } = useAuth();

  const { permissions } = useUserRole();
  const { currentUser } = useStore();

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

  // const hasNameChanged: boolean = formData.name &&
  //   formData.name.trim() === editingMarketCenter?.name.trim();
  // const haveAssignmentsChanged: boolean =
  //   assignedUsers.length !== formData.selectedUsers.length ||
  //   !arraysEqualById(assignedUsers, formData.selectedUsers);

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = "Name is required";
    if (!formData.selectedUsers || !formData.selectedUsers.length) {
      errors.users = "Select at least one user";
    }

    // if (!hasNameChanged && !haveAssignmentsChanged) {
    //   errors.name = "Nothing to update";
    //   errors.users = "Nothing to update";
    // }

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
    } catch (error) {
      console.error(
        "MarketCenterManagement - Unable to generate notifications",
        error
      );
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
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to update market center`);
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
                templateName: `Market Center User ${user.updateType === "added" ? "Added" : "Removed"}`,
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
    onError: (error) => {
      console.error("Failed to edit new market center", error);
      toast.error(`Error: Unable to save changes`);
    },
    onSettled: () => {
      refreshMarketCenters();
      refreshUsers();
      setIsSubmitting(false);
    },
  });

  const handleUpdateMarketCenter = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!permissions?.canManageAllMarketCenters) {
      toast.warning("Only Admin can update market centers");
      return;
    }
    setIsSubmitting(true);
    if (!editingMarketCenter?.id) {
      throw new Error("Missing marker center id");
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
            <label className="text-md font-medium">Team Assignments *</label>
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
                (!assignedUsers || !assignedUsers.length) &&
                (!unassignedUsers || !unassignedUsers.length)
              }
              marketCenterId={editingMarketCenter?.id || null}
              placeholder={
                formData.selectedUsers && formData.selectedUsers.length
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

            <Button
              type="submit"
              disabled={isSubmitting} // { isSubmitting || !hasNameChanged || !haveAssignmentsChanged }
            >
              {isSubmitting ? "Saving..." : "Submit"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
