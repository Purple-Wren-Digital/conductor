"use client";

import type React from "react";
import { useCallback, useState } from "react";
import { getAccessToken } from "@auth0/nextjs-auth0";
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
import { useUserRole } from "@/lib/hooks/use-user-role";
import type { MarketCenter, MarketCenterForm, PrismaUser } from "@/lib/types";
import { toast } from "sonner";

import UserMultiSelectDropdown from "../multi-select/user-multi-select-dropdown";

type EditMarketCenterProps = {
  editingMarketCenter: MarketCenter | null;
  setEditingMarketCenter: React.Dispatch<
    React.SetStateAction<MarketCenter | null>
  >;
  showEditMCForm: boolean;
  setShowEditMCForm: React.Dispatch<React.SetStateAction<boolean>>;
  assignedUsers: PrismaUser[];
  unassignedUsers: PrismaUser[];
  formData: MarketCenterForm;
  setFormData: React.Dispatch<React.SetStateAction<MarketCenterForm>>;
  refreshMarketCenters: () => Promise<void>;
  refreshUsers: () => Promise<void>;
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

  const { permissions } = useUserRole();

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
    setEditingMarketCenter(null);
  };

  function arraysEqualById(a: { id: string }[], b: { id: string }[]) {
    if (a.length !== b.length) return false;

    const aIds = a.map((u) => u.id).sort();
    const bIds = b.map((u) => u.id).sort();

    return aIds.every((id, i) => id === bIds[i]);
  }
  const hasNameChanged: boolean =
    formData.name.trim() === editingMarketCenter?.name.trim();
  const haveAssignmentsChanged: boolean =
    assignedUsers.length !== formData.selectedUsers.length ||
    !arraysEqualById(assignedUsers, formData.selectedUsers);

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = "Name is required";
    if (!formData.selectedUsers || !formData.selectedUsers.length) {
      errors.users = "Select at least one user";
    }

    if (!hasNameChanged && !haveAssignmentsChanged) {
      errors.name = "Nothing to update";
      errors.users = "Nothing to update";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const getAuth0AccessToken = useCallback(async () => {
    if (process.env.NODE_ENV === "development") return "local";
    return await getAccessToken();
  }, []);

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

    try {
      const accessToken = await getAuth0AccessToken();
      if (!accessToken) {
        throw new Error("No token fetched");
      }
      const response = await fetch(
        `${API_BASE}/marketCenters/${editingMarketCenter?.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            name: formData.name,
            users: formData.selectedUsers,
          }),
        }
      );
      if (!response.ok) throw new Error("Failed to fetch market centers");

      toast.success(
        `${formData?.name ? formData.name : "Market Center"} was updated`
      );
      await refreshMarketCenters();
      await refreshUsers();
      resetAndCloseForm();
    } catch (error) {
      console.error("Failed to edit new market center", error);
      toast.error(`Error: Unable to save changes`);
    } finally {
      setIsSubmitting(false);
    }
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
              disabled={
                isSubmitting || !hasNameChanged || !haveAssignmentsChanged
              }
            >
              {isSubmitting ? "Saving..." : "Submit"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
function setSelectedMarketCenterUsers(arg0: PrismaUser[]) {
  throw new Error("Function not implemented.");
}
