import { Dispatch, JSX, SetStateAction, useCallback, useState } from "react";
import { getAccessToken } from "@auth0/nextjs-auth0";
import { useRemoveTeamMember } from "@/hooks/use-settings";
import { TeamMember } from "@/lib/api/settings";
import { useUserRole } from "@/lib/hooks/use-user-role";
import { UserRole } from "@/lib/types";
import { roleOptions } from "@/lib/utils";
import { Trash2, Save, Edit3 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog/base-dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

import { API_BASE } from "@/lib/api/utils";

type EditingMember = {
  id: string;
  currentRole: string;
} | null;

type TeamUserActionsProps = {
  member: TeamMember;
  editingMember: EditingMember;
  setEditingMember: Dispatch<
    SetStateAction<{
      id: string;
      currentRole: string;
    } | null>
  >;
  getRoleIcon: (role: string) => JSX.Element;
};

type UserFormDataStaffProps = {
  name: string;
  isActive: boolean;
  email: string;
  role: "STAFF" | "AGENT" | "ADMIN";
};

// Menu drop down for team management
export default function TeamUserActions({
  member,
  editingMember,
  setEditingMember,
  getRoleIcon,
}: TeamUserActionsProps) {
  const [formData, setFormData] = useState<UserFormDataStaffProps>({
    name: member?.name || "",
    isActive: member?.isActive || false,
    email: member?.email || "",
    role: member.role || "AGENT",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const removeTeamMember = useRemoveTeamMember();
  const { role, permissions } = useUserRole();

  const getAuth0AccessToken = useCallback(async () => {
    if (process.env.NODE_ENV === "development") return "local";
    return await getAccessToken();
  }, []);

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    try {
      await removeTeamMember.mutateAsync(memberId);
      toast.success(`${memberName} has been removed from the team`);
    } catch (error) {
      toast.error("Failed to remove team member");
    }
  };

  const handleSubmitUserUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // TODO: FORM VALIDATION
    try {
      const accessToken = await getAuth0AccessToken();
      const response = await fetch(`${API_BASE}/users/${member.id}/update`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          id: member.id,
          name: formData.name,
          role: formData.role,
          isActive: formData.isActive,
          email: formData.email,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("Update failed:", response.status, errText);
      } else {
        console.log("Update success", await response.json());
      }
    } catch (error) {
      console.error("Failed to update user", error);
    } finally {
      setIsSubmitting(false);
      setEditingMember(null); // closes dialog
    }
  };

  return (
    <div className="flex items-center justify-end gap-2">
      {/* STAFF: EDIT User - email, name, isActive */}
      {/* ADMIN: + Change Role */}
      <Dialog
        open={editingMember?.id === member.id}
        onOpenChange={(open) => !open && setEditingMember(null)}
      >
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setEditingMember({
                id: member.id,
                currentRole: member.role,
              })
            }
          >
            <Edit3 className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editing {member.name}</DialogTitle>
            <DialogDescription>Press save when complete</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitUserUpdate} className="space-y-4 py-4">
            <div className="flex gap-3 items-center justify-between">
              <Label className="font-bold">User Role:</Label>
              <Select
                value={formData.role}
                onValueChange={(value: UserRole) =>
                  setFormData({ ...formData, role: value })
                }
                disabled={isSubmitting || !permissions?.canChangeUserRoles}
              >
                <SelectTrigger className="w-7/12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((role) => (
                    <SelectItem key={role} value={role}>
                      <div className="flex items-center gap-2">
                        {getRoleIcon(role)}
                        <p>{role}</p>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 items-center justify-between">
              <Label htmlFor="isActive" className="font-bold">
                Active User:
              </Label>
              <div className="w-7/12 pl-3 flex items-center">
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      isActive: checked,
                    })
                  }
                  disabled={isSubmitting}
                />
              </div>
            </div>
            <div className="flex gap-3 items-center justify-between">
              <Label htmlFor="name" className="font-bold">
                Full Name:
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    name: e.target.value,
                  });
                }}
                disabled={isSubmitting}
                className="w-7/12"
              />
            </div>
            <div className="flex gap-3 items-center justify-between">
              <Label htmlFor="email" className="font-bold">
                Email:
              </Label>
              <Input
                id="email"
                value={formData.email}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    email: e.target.value,
                  });
                }}
                className="w-7/12"
              />
            </div>
            <div className="flex justify-center pt-8">
              <Button type="submit" disabled={isSubmitting} className="w-7/12">
                <Save />
                <p>Save</p>
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* STAFF: REMOVE User */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {member.name} from your team? This
              action cannot be undone and will revoke their access immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleRemoveMember(member.id, member.name)}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Remove Member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
