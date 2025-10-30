"use client";

import type React from "react";
import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Badge } from "../badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog/base-dialog";
import { Input } from "@/components/ui/input";
import { API_BASE } from "@/lib/api/utils";
import type {
  MarketCenterForm,
  MarketCenterNotificationCallback,
  PrismaUser,
} from "@/lib/types";
import { toast } from "sonner";
import UserMultiSelectDropdown from "../multi-select/user-multi-select-dropdown";
import { useStore } from "@/context/store-provider";

type CreateMarketCenterProps = {
  showCreateMCForm: boolean;
  setShowCreateMCForm: React.Dispatch<React.SetStateAction<boolean>>;
  formData: MarketCenterForm;
  setFormData: React.Dispatch<React.SetStateAction<MarketCenterForm>>;
  unassignedUsers: PrismaUser[];
  refreshMarketCenters: Promise<void>;
  refreshUsers: Promise<void>;
  handleSendMarketCenterNotifications: ({
    trigger,
    receivingUser,
    data,
  }: MarketCenterNotificationCallback) => Promise<void>;
};

export default function CreateMarketCenter({
  showCreateMCForm,
  setShowCreateMCForm,
  formData,
  setFormData,
  unassignedUsers,
  refreshMarketCenters,
  refreshUsers,
  handleSendMarketCenterNotifications,
}: CreateMarketCenterProps) {
  const { user: clerkUser } = useUser();
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { currentUser } = useStore();

  const resetAndCloseForm = () => {
    setFormData({
      name: "",
      selectedUsers: [],
    });
    setFormErrors({});
    setShowCreateMCForm(false);
  };

  const handleSetSelectedUserOptions = (newSelected: PrismaUser[]) => {
    setFormData((prev) => ({
      ...prev,
      selectedUsers: newSelected,
    }));
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = "Name is required";
    if (!formData.selectedUsers || !formData.selectedUsers.length) {
      errors.users = "Select at least one user";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateMarketCenter = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!validateForm()) {
      toast.error("Invalid form input(s)");
      setIsSubmitting(false);
      return;
    }

    try {
      const accessToken = clerkUser?.id || "";
      if (!accessToken) {
        throw new Error("No token fetched");
      }
      const response = await fetch(`${API_BASE}/marketCenters`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          users: formData.selectedUsers,
        }),
      });
      if (!response.ok) {
        throw new Error(
          response?.statusText
            ? response.statusText
            : "Failed to create market center"
        );
      }
      const data = await response.json();
      console.log("DATA - CREATE MARKET CENTER", data);
      if (
        data &&
        data?.marketCenter &&
        data?.marketCenter?.users &&
        data?.marketCenter?.users.length > 0
      ) {
        await Promise.all(
          data?.marketCenter?.users.map(async (user: PrismaUser) => {
            await handleSendMarketCenterNotifications({
              trigger: "Market Center Assignment",
              receivingUser: {
                id: user?.id,
                name: user?.name ?? "You",
                email: user?.email,
              },
              data: {
                marketCenterAssignment: {
                  userUpdate: "added",
                  marketCenterId: data?.marketCenter?.id,
                  marketCenterName: data?.marketCenter?.name,
                  userName: user?.name ?? user?.email,
                  editorEmail: currentUser?.email ?? "N/A",
                  editorName: currentUser?.name ?? "Another user",
                },
              },
            });
          })
        );

        toast.success(`${data?.name} was created!`);
      }

      resetAndCloseForm();
    } catch (error) {
      console.error("Failed to create new market center", error);
      toast.error(`Error: Unable to create market center`);
    } finally {
      await refreshMarketCenters;
      await refreshUsers;
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={showCreateMCForm} onOpenChange={setShowCreateMCForm}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Market Center</DialogTitle>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleCreateMarketCenter}>
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
              className={formErrors.name ? "border-destructive" : ""}
            />
            <p className="text-sm text-destructive">
              {formErrors?.name && formErrors.name}
            </p>
          </div>
          <div className="space-y-2 space-x-2 w-full">
            <label className="text-md font-medium">Team Assignments *</label>
            <div className="space-y-2 space-x-2 w-full">
              {formData &&
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
              disabled={!unassignedUsers || !unassignedUsers.length}
              marketCenterId={null}
              placeholder={
                formData.selectedUsers && formData.selectedUsers.length
                  ? `${formData.selectedUsers.length} users selected`
                  : unassignedUsers && unassignedUsers.length > 0
                    ? "Select users"
                    : "No available users found"
              }
              formFieldName="Users"
              options={[...unassignedUsers]}
              selectedOptions={formData.selectedUsers}
              handleSetSelectedOptions={handleSetSelectedUserOptions}
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
              onClick={() => resetAndCloseForm()}
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
