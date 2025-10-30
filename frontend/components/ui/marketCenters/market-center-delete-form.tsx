"use client";

import type React from "react";
import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog/base-dialog";
import { API_BASE } from "@/lib/api/utils";
import { useUserRole } from "@/hooks/use-user-role";
import type {
  MarketCenter,
  MarketCenterNotificationCallback,
  PrismaUser,
} from "@/lib/types";
import { toast } from "sonner";
import { useStore } from "@/context/store-provider";
import { useMutation } from "@tanstack/react-query";

type DeleteMarketCenterProps = {
  marketCenterToDelete: MarketCenter | null;
  setMarketCenterToDelete: React.Dispatch<
    React.SetStateAction<MarketCenter | null>
  >;
  showDeleteModal: boolean;
  setShowDeleteModal: React.Dispatch<React.SetStateAction<boolean>>;
  refreshMarketCenters: Promise<void>;
  refreshUsers: Promise<void>;
  handleSendMarketCenterNotifications: ({
    trigger,
    receivingUser,
    data,
  }: MarketCenterNotificationCallback) => Promise<void>;
};

export default function DeleteMarketCenter({
  marketCenterToDelete,
  setMarketCenterToDelete,
  showDeleteModal,
  setShowDeleteModal,
  refreshMarketCenters,
  refreshUsers,
  handleSendMarketCenterNotifications,
}: DeleteMarketCenterProps) {
  const [deleting, setDeleting] = useState(false);
  const { user: clerkUser } = useUser();

  const { permissions } = useUserRole();
  const { currentUser } = useStore();

  const resetAndCloseModal = () => {
    setShowDeleteModal(false);
    setMarketCenterToDelete(null);
  };

  const deleteMarketCenterMutation = useMutation({
    mutationFn: async () => {
      if (!permissions?.canDeactivateUsers) {
        toast.warning("Only Admin users can deactivate market centers.");
        return;
      }
      if (!marketCenterToDelete || !marketCenterToDelete?.id) {
        toast.error("Cannot find market center");
        return;
      }
      setDeleting(true);
      const accessToken = clerkUser?.id || "";
      const response = await fetch(
        `${API_BASE}/marketCenters/${marketCenterToDelete.id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ id: marketCenterToDelete.id }),
        }
      );

      if (!response.ok) {
        throw new Error(
          response?.statusText
            ? response.statusText
            : "Failed to delete market center"
        );
      }
    },
    onSuccess: async () => {
      toast.success(
        `${marketCenterToDelete?.name ? marketCenterToDelete.name : "Market Center"} was deactivated`
      );
      if (
        marketCenterToDelete?.users &&
        marketCenterToDelete?.users.length > 0
      ) {
        await Promise.all(
          marketCenterToDelete?.users.map(async (user: PrismaUser) => {
            await handleSendMarketCenterNotifications({
              trigger: "Market Center Assignment",
              receivingUser: {
                id: user?.id,
                name: user?.name ?? "You",
                email: user?.email,
              },
              data: {
                marketCenterAssignment: {
                  userUpdate: "removed",
                  marketCenterId: marketCenterToDelete?.id,
                  marketCenterName: marketCenterToDelete?.name,
                  userName: user?.name ?? user?.email,
                  editorEmail: currentUser?.email ?? "N/A",
                  editorName: currentUser?.name ?? "Another user",
                },
              },
            });
          })
        );
      }
      resetAndCloseModal();
    },
    onError: (error) => {
      console.error("Unable to remove market center", error);
      toast.error("Error: Unable to remove market center");
    },
    onSettled: async () => {
      await refreshMarketCenters;
      await refreshUsers;
      setDeleting(false);
    },
  });

  return (
    <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Remove {marketCenterToDelete?.name} (
            {marketCenterToDelete?.id.slice(0, 8)}) from Market Centers?
          </DialogTitle>
          {marketCenterToDelete ? (
            <DialogDescription>
              Once removed, {marketCenterToDelete?.users?.length ?? "0"}{" "}
              assigned users will lose their market center connection.{" "}
              <span className="font-semibold">
                This action cannot be undone.
              </span>
            </DialogDescription>
          ) : null}
        </DialogHeader>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => resetAndCloseModal()}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => deleteMarketCenterMutation.mutate()}
            disabled={deleting || !permissions?.canDeactivateUsers}
          >
            {deleting
              ? "Removing..."
              : `Remove ${marketCenterToDelete?.name} (${marketCenterToDelete?.id.slice(0, 8)})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
