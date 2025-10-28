"use client";

import { Dispatch, SetStateAction, useState } from "react";
import { useStore } from "@/context/store-provider";
import { useUser } from "@clerk/nextjs";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserListItem } from "@/components/ui/list-item/user-list-item";
import { API_BASE } from "@/lib/api/utils";
import { useUserRole } from "@/hooks/use-user-role";
import type { MarketCenter, PrismaUser, UserRole } from "@/lib/types";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";

// type UpdateUserForm = {
//   marketCenter: MarketCenter;
//   role: UserRole;
//   name: string;
//   email: string;
// };

export default function MarketCenterUsers({
  marketCenter,
  isLoading,
  setIsLoading,
  invalidateMarketCenter,
}: {
  marketCenter: MarketCenter;
  isLoading: boolean;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  invalidateMarketCenter: Promise<void>; // () => void;
}) {
  const router = useRouter();
  const { user: clerkUser } = useUser();
  const [showRemoveUserForm, setShowRemoveUserForm] = useState(false);
  const [userToRemove, setUserToRemove] = useState<PrismaUser | null>(null);

  const { currentUser } = useStore();
  const { permissions } = useUserRole();

  const teamMembers = marketCenter?.users ?? [];

  // REMOVAL
  const openRemoveUserModal = (user: PrismaUser) => {
    setUserToRemove(user);
    setShowRemoveUserForm(true);
  };

  const sendUserUpdateNotification = async (
    data: PrismaUser,
    userUpdate: "added" | "removed"
  ) => {
    const body = {
      userUpdate: userUpdate,
      marketCenter: marketCenter,
      userName: data?.name,
      userEmail: data?.email,
      editorName: currentUser?.name,
      editorEmail: currentUser?.email,
    };
    try {
      const response = await fetch("/api/send/marketCenters/addUser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ body }),
      });
      if (!response || !response.ok)
        throw new Error(
          response?.statusText
            ? response?.statusText
            : "Failed to send user update email"
        );
    } catch (error) {
      console.error("Failed to send team member update", error);
    }
  };

  const removeUserMutation = useMutation({
    mutationFn: async (user: PrismaUser) => {
      if (!marketCenter || !marketCenter?.id)
        throw new Error("Missing Market Center ID");

      const accessToken = clerkUser?.id || "";
      const response = await fetch(
        `${API_BASE}/marketCenters/users/${marketCenter.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            users: [user],
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to update market center");
      const data = await response.json();
      if (data) await sendUserUpdateNotification(user, "removed");

      return user;
    },
    onSuccess: async (_, user) => {
      toast.success(`${user?.name} was removed`);
      await invalidateMarketCenter;
    },
    onError: (error) => {
      console.error("Failed to remove user", error);
      toast.error("Failed to remove user");
    },
  });

  const handleRemoveUser = async (user: PrismaUser | null) => {
    if (!user) throw new Error("User data is missing");
    setIsLoading(true);
    removeUserMutation.mutate(user);
    setIsLoading(false);
    setUserToRemove({} as PrismaUser);
    setShowRemoveUserForm(false);
  };

  return (
    <>
      <Card className="lg:col-span-2">
        <CardHeader className="flex justify-between align-center">
          <div className="flex flex-row space-x-2 items-center justify-between">
            <div className="space-y-1">
              <CardTitle>Team Members</CardTitle>
            </div>
            {/* <div className="flex space-x-2">
                {permissions?.canManageTeam && (
                  <AddTeamMemberModal
                    marketCenter={marketCenter}
                    disabled={!marketCenter}
                    getRoleIcon={getRoleIcon}
                    sendUserUpdateNotification={sendUserUpdateNotification}
                  />
                )}
              </div> */}
          </div>
        </CardHeader>
        <CardContent>
          <div
            className={`space-y-4 transition-opacity duration-300 
              ${isLoading ? "opacity-50 pointer-events-none" : "opacity-100"}`}
          >
            {isLoading && (
              <p className="text-muted-foreground">Loading team members... </p>
            )}
            {/* !isLoading && */}
            {teamMembers &&
              teamMembers.length > 0 &&
              teamMembers.map((member, index) => {
                const self = member.id === currentUser?.id;
                const cannotUpdateAdmin =
                  member.role === "ADMIN" && currentUser?.role !== "ADMIN";

                return (
                  <UserListItem
                    key={member.id + index}
                    user={member}
                    onEdit={() => router.push(`/dashboard/users/${member.id}`)}
                    deleteLabel="Remove"
                    onClick={() => router.push(`/dashboard/users/${member.id}`)}
                    onDelete={() => openRemoveUserModal(member)}
                  />
                );
              })}
            {!isLoading && (!teamMembers || !teamMembers.length) && (
              <p className="text-muted-foreground">
                No team members found. Contact Admin if you haven&apos;t been
                assigned a team.
              </p>
            )}
          </div>
          {/* <PagesAndItemsCount
            type="users"
            totalItems={totalTeamMembers}
            itemsPerPage={itemsPerPage}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            totalPages={totalPages}
          /> */}
        </CardContent>
      </Card>

      {/* REMOVE TEAM MEMBER */}
      <AlertDialog
        open={showRemoveUserForm}
        onOpenChange={setShowRemoveUserForm}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{" "}
              <span className={"font-semibold"}>
                {userToRemove?.name ? userToRemove.name : "this person"}
              </span>{" "}
              from your team? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              disabled={isLoading}
              variant="outline"
              onClick={() => setShowRemoveUserForm(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleRemoveUser(userToRemove)}
              variant="destructive"
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={isLoading || !permissions?.canManageTeam}
            >
              Remove Member
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
