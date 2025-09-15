import { Dispatch, JSX, SetStateAction, useCallback, useState } from "react";
import { getAccessToken } from "@auth0/nextjs-auth0";
import { settingsKeys, useRemoveTeamMember } from "@/hooks/use-settings";
import { TeamMember } from "@/lib/api/settings";
import { useUserRole } from "@/lib/hooks/use-user-role";
import { UserRole } from "@/lib/types";
import { roleOptions } from "@/lib/utils";
import { Save, Edit3, MinusCircle } from "lucide-react";
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
import { useQueryClient } from "@tanstack/react-query";

type TeamUserActionsProps = {
  self: boolean;
  cannotUpdateAdmin: boolean;
  member: TeamMember;
  editingMember: {
    id: string;
  } | null;
  setEditingMember: Dispatch<
    SetStateAction<{
      id: string;
    } | null>
  >;
  getRoleIcon: (role: string) => JSX.Element;
};

type UserFormProps = {
  id: string;
  name: string;
  isActive: boolean;
  email: string;
  role: UserRole;
};

export default function TeamUserActions({
  self,
  cannotUpdateAdmin,
  member,
  editingMember,
  setEditingMember,
  getRoleIcon,
}: TeamUserActionsProps) {
  const [formData, setFormData] = useState<UserFormProps>({
    id: member.id,
    name: member?.name || "",
    isActive: member?.isActive || false,
    email: member?.email || "",
    role: member.role || "AGENT",
  });
  const queryClient = useQueryClient();

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const removeTeamMember = useRemoveTeamMember();
  const { role, permissions } = useUserRole();

  const getAuth0AccessToken = useCallback(async () => {
    if (process.env.NODE_ENV === "development") return "local";
    return await getAccessToken();
  }, []);

  // TODO: Remove Team Member, not delete user
  // const handleRemoveMember = async (memberId: string, memberName: string) => {
  //   setIsSubmitting(true);

  //   try {
  //     // await removeTeamMember.mutateAsync(memberId);
  //     // const accessToken = await getAuth0AccessToken();
  //     // const response = await fetch(`${API_BASE}/users/${memberId}`, {
  //     //   method: "DELETE",
  //     //   headers: {
  //     //     "Content-Type": "application/json",
  //     //     Authorization: `Bearer ${accessToken}`,
  //     //   },
  //     //   body: JSON.stringify({ id: memberId }),
  //     // });
  //     // const data = await response.json();
  //     // if (!response.ok)
  //     //   throw new Error(data.message || "Failed to deactivate user");
  //     // // toast.success(`Deactivated user: ${memberId}`);
  //     // queryClient.setQueryData(settingsKeys.teamMembers(), (oldData: any) => {
  //     //   if (!oldData) return oldData;

  //     //   const members = Array.isArray(oldData.members) ? oldData.members : [];
  //     //   const newMembers = members.filter((m: any) => m.id !== memberId);

  //     //   return {
  //     //     ...oldData,
  //     //     members: newMembers,
  //     //   };
  //     // });
  //     toast.success(`${memberName} has been removed from the team`);
  //   } catch (error) {
  //     console.error("Team Management - Failed to remove team member", error);
  //     toast.error("Failed to remove team member");
  //   } finally {
  //     setIsSubmitting(false);
  //   }
  // };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = "Required";
    if (role === "ADMIN" && !formData.role) errors.role = "Required";
    if (!formData.email.trim()) {
      errors.email = "Required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Invalid email format";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitUserUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!validateForm()) {
      setIsSubmitting(false);
      toast.error("Invalid input(s)");
      return;
    }
    try {
      const accessToken = await getAuth0AccessToken();
      const response = await fetch(`${API_BASE}/users/${member.id}/update`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          id: formData.id,
          name: formData.name.trim(),
          role: role === "ADMIN" ? formData.role : undefined,
          isActive: formData.isActive,
          email: formData.email.trim(),
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Update failed: ${errText}`);
      }
      const data = await response.json();
      const updatedUser = data?.user as TeamMember | undefined;

      if (!updatedUser) {
        throw new Error(`Update failed: Could not parse response.json()`);
      } else {
        queryClient.setQueryData(settingsKeys.teamMembers(), (oldData: any) => {
          if (!oldData) return oldData;
          const members = Array.isArray(oldData.members) ? oldData.members : [];
          const idx = members.findIndex((m: any) => m.id === updatedUser.id);
          let newMembers;
          if (idx === -1) {
            newMembers = [updatedUser, ...members];
          } else {
            newMembers = members.map((m: any) =>
              m.id === updatedUser.id ? { ...m, ...updatedUser } : m
            );
          }
          return {
            ...oldData,
            members: newMembers,
          };
        });
      }
      toast.success(`${formData.name} has been updated`);
      setEditingMember(null); // closes dialog
    } catch (error) {
      toast.error(`Failed to update ${member.name}`);
      console.error("Failed to update user", error);
      queryClient.invalidateQueries({ queryKey: settingsKeys.teamMembers() });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-end gap-2">
      <Dialog
        open={editingMember?.id === member.id}
        onOpenChange={(open) => !open && setEditingMember(null)}
      >
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditingMember({ id: member.id })}
            disabled={cannotUpdateAdmin}
          >
            <Edit3 className="h-4 w-4" />
            Edit
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editing {member.name}</DialogTitle>
            <DialogDescription>Press save when complete</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitUserUpdate} className="space-y-4 py-4">
            <div className="flex gap-3 items-center justify-between">
              <div>
                <Label className="font-bold">User Role:</Label>
                {formErrors?.role && (
                  <p className="text-sm text-destructive pt-1">
                    {formErrors.role}
                  </p>
                )}
              </div>
              <Select
                value={formData.role}
                onValueChange={(value: UserRole) =>
                  setFormData({ ...formData, role: value })
                }
                disabled={
                  isSubmitting || !permissions?.canChangeUserRoles || self
                }
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
                  disabled={
                    isSubmitting || self || !permissions?.canChangeUserRoles
                  }
                />
              </div>
            </div>
            <div className="flex gap-3 items-center justify-between">
              <div>
                <Label htmlFor="name" className="font-bold">
                  Full Name:
                </Label>
                {formErrors?.name && (
                  <p className="text-sm text-destructive pt-1">
                    {formErrors.name}
                  </p>
                )}
              </div>
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
                className={`w-7/12 ${formErrors?.name && "border-destructive"}`}
              />
            </div>

            <div className="flex gap-3 items-center justify-between">
              <div>
                <Label htmlFor="email" className="font-bold">
                  Email:
                </Label>
                {formErrors?.email && (
                  <p className="text-sm text-destructive pt-1">
                    {formErrors.email}
                  </p>
                )}
              </div>
              <Input
                id="email"
                value={formData.email}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    email: e.target.value,
                  });
                }}
                className={`w-7/12 ${formErrors?.email && "border-destructive"}`}
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

      {/* TODO: REMOVE FROM TEAM, NOT DELETE USER */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            disabled={self || cannotUpdateAdmin}
          >
            <MinusCircle className="h-4 w-4" />
            Remove
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
              onClick={() => console.log("Clicked handleRemoveMember()")} // handleRemoveMember(member.id, member.name)}
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={true}
            >
              Remove Member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
