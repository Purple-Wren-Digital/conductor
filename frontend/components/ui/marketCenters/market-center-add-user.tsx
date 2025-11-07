"use client";

import { JSX, useCallback, useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog/base-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { API_BASE } from "@/lib/api/utils";
import { useUserRole } from "@/hooks/use-user-role";
import { MarketCenter, PrismaUser } from "@/lib/types";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type AddTeamMemberProps = {
  marketCenter: MarketCenter;
  disabled: boolean;
  getRoleIcon: (role: string) => JSX.Element;
  sendUserUpdateNotification: (
    data: PrismaUser,
    userUpdate: "added" | "removed"
  ) => Promise<void>;
};

export default function AddTeamMember({
  marketCenter,
  disabled,
  getRoleIcon,
  sendUserUpdateNotification,
}: AddTeamMemberProps) {
  const queryClient = useQueryClient();

  const [unassignedUsers, setUnassignedUsers] = useState<PrismaUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<PrismaUser | null>(null);
  const [formError, setFormError] = useState<string>("");

  const { permissions } = useUserRole();
  const { getToken } = useAuth();

  const [showInviteDialog, setShowInviteDialog] = useState(false);

  const fetchActiveUsers = useCallback(async () => {
    setIsLoading(true);
    const params = !permissions?.canCreateUsers ? `?role=AGENT` : "";

    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Failed to get authentication token");
      }
      const response = await fetch(`${API_BASE}/users${params}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch users");
      const data: { users: PrismaUser[] } = await response.json();

      const needsAssignment: PrismaUser[] = data.users.filter((user) => {
        if (!user?.marketCenterId) return user;
      });
      setUnassignedUsers(needsAssignment || []);
    } catch (error) {
      console.error("Error fetching users", error);
    } finally {
      setIsLoading(false);
    }
  }, [permissions, getToken]);

  useEffect(() => {
    if (!showInviteDialog) return;
    fetchActiveUsers();
  }, [fetchActiveUsers, showInviteDialog]);

  const handleSelectUser = (value: string) => {
    const user = unassignedUsers.find((u) => u?.id === value);
    if (user) setSelectedUser(user);
  };

  const addUserMutation = useMutation({
    mutationFn: async (user: PrismaUser) => {
      if (!marketCenter?.id) throw new Error("Missing Market Center ID");

      const token = await getToken();
      if (!token) {
        throw new Error("Failed to get authentication token");
      }
      const response = await fetch(
        `${API_BASE}/marketCenters/${marketCenter.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            users: [...(marketCenter.users || []), user],
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to update market center");
      const data = await response.json();
      if (data) await sendUserUpdateNotification(user, "added");

      return user;
    },
    onSuccess: (_, user) => {
      toast.success(`${user.name || "User"} was added`);
      queryClient.invalidateQueries({
        queryKey: ["staff-market-center", marketCenter.id],
      });
    },
    onError: (error) => {
      console.error("Failed to add user", error);
      toast.error("Failed to add user");
    },
  });

  const handleSubmitAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) {
      setFormError("Please select one");
      return;
    }
    setIsLoading(true);
    addUserMutation.mutate(selectedUser);
    setIsLoading(false);
    setShowInviteDialog(false);
    setSelectedUser(null);
  };

  return (
    <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
      <DialogTrigger
        asChild
        disabled={disabled || isLoading} // TODO: Email notification and logic
      >
        <Button disabled={!permissions?.canManageTeam} variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Add Team Members
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Team Members</DialogTitle>
          <DialogDescription>{marketCenter?.name}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmitAddUser} className="space-y-4">
          <label className="text-sm font-medium">Users *</label>
          <Select
            value={selectedUser?.id}
            onValueChange={handleSelectUser}
            disabled={isLoading || !unassignedUsers || !unassignedUsers.length}
          >
            <SelectTrigger className=" h-8">
              <SelectValue
                placeholder={
                  unassignedUsers && unassignedUsers.length
                    ? "Select a user"
                    : "No available users"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {/* <SelectItem value={""}></SelectItem> */}
              {unassignedUsers &&
                unassignedUsers.length > 0 &&
                unassignedUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    <div className="flex items-center gap-2">
                      {getRoleIcon(user.role)}
                      {user?.name}
                    </div>
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <p>{formError && `${formError}`}</p>

          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowInviteDialog(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              // disabled={inviteTeamMember.isPending}
              disabled={!selectedUser}
            >
              Submit
              {/* {isLoading ? "Submitting..." : "Submit"} */}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
