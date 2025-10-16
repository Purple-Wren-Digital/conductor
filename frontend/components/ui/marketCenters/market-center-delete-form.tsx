"use client";

import type React from "react";
import { useState, useCallback } from "react";
import { getAccessToken } from "@auth0/nextjs-auth0";
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
import type { MarketCenter } from "@/lib/types";
import { toast } from "sonner";

type DeleteMarketCenterProps = {
  marketCenterToDelete: MarketCenter | null;
  setMarketCenterToDelete: React.Dispatch<
    React.SetStateAction<MarketCenter | null>
  >;
  showDeleteModal: boolean;
  setShowDeleteModal: React.Dispatch<React.SetStateAction<boolean>>;
  refreshMarketCenters: Promise<void>;
  refreshUsers: Promise<void>;
};

export default function DeleteMarketCenter({
  marketCenterToDelete,
  setMarketCenterToDelete,
  showDeleteModal,
  setShowDeleteModal,
  refreshMarketCenters,
  refreshUsers,
}: DeleteMarketCenterProps) {
  const [deleting, setDeleting] = useState(false);

  const { permissions } = useUserRole();

  const resetAndCloseModal = () => {
    setShowDeleteModal(false);
    setMarketCenterToDelete(null);
  };

  const getAuth0AccessToken = useCallback(async () => {
    if (process.env.NODE_ENV === "development") return "local";
    return await getAccessToken();
  }, []);

  const confirmDeleteMarketCenter = async () => {
    if (!permissions?.canDeactivateUsers) {
      toast.warning("Only Admin users can deactivate market centers.");
      return;
    }
    if (!marketCenterToDelete || !marketCenterToDelete?.id) {
      toast.error("Cannot find market center");
      return;
    }

    try {
      setDeleting(true);
      const accessToken = await getAuth0AccessToken();
      const response = await fetch(
        `${API_BASE}/marketCenters/${marketCenterToDelete.id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ id: marketCenterToDelete.id }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to deactivate market center");
      }
      const data = await response.json();
      if (!data) {
        throw new Error("Failed to deactivate user");
      }
      toast.success(
        `${marketCenterToDelete?.name ? marketCenterToDelete.name : "Market Center"} was deactivated`
      );
      await refreshMarketCenters;
      await refreshUsers;
      resetAndCloseModal();
    } catch (error) {
      console.error("Unable to remove market center", error);
      toast.error("Error: Unable to remove market center");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Remove {marketCenterToDelete?.name} (
            {marketCenterToDelete?.id.slice(0, 8)}) from Market Centers?
          </DialogTitle>
          <DialogDescription>
            {marketCenterToDelete ? (
              <>
                <p>
                  Once removed, {marketCenterToDelete?.users?.length ?? "0"}{" "}
                  assigned users will lose their market center connection.{" "}
                  <span className="font-semibold">
                    This action cannot be undone.
                  </span>
                </p>
              </>
            ) : null}
          </DialogDescription>
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
            onClick={confirmDeleteMarketCenter}
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
