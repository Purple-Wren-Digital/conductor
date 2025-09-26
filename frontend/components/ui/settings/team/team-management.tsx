"use client";

import { useCallback, useState } from "react";
import { useStore } from "@/app/store-provider";
import { getAccessToken } from "@auth0/nextjs-auth0";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../dialog/base-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserListItem } from "@/components/ui/list-item/user-list-item";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../select";
import { MarketCenter, PrismaUser, SortDir, UserRole } from "@/lib/types";
import { API_BASE } from "@/lib/api/utils";
import { useUserRole } from "@/lib/hooks/use-user-role";
import {
  roleOptions,
  ROLE_COLORS,
  ROLE_DESCRIPTIONS,
  ROLE_ICONS,
} from "@/lib/utils";
import { Building, User } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AddTeamMemberModal from "./team-management-add-user";
import { useFetchMarketCenter } from "@/hooks/use-market-center";

type UpdateUserForm = {
  marketCenter: MarketCenter;
  role: UserRole;
  name: string;
  email: string;
};

type UserSortBy = "updatedAt" | "createdAt";

export default function TeamManagement() {
  const queryClient = useQueryClient();
  
  const [sortBy, setSortBy] = useState<UserSortBy>("updatedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showEditUserForm, setShowEditUserForm] = useState(false);
  const [editingTeamMember, setEditingTeamMember] = useState<PrismaUser>(
    {} as PrismaUser
  );
  const [formData, setFormData] = useState<UpdateUserForm>(
    {} as UpdateUserForm
  );
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [showRemoveUserForm, setShowRemoveUserForm] = useState(false);
  const [userToRemove, setUserToRemove] = useState<PrismaUser>(
    {} as PrismaUser
  );
  const { currentUser } = useStore();

  const { permissions } = useUserRole();

  const marketCenterId = currentUser?.marketCenterId
    ? currentUser?.marketCenterId
    : "";

  const { data: marketCenter, isLoading } =
    useFetchMarketCenter(marketCenterId);

  const teamMembers: PrismaUser[] =
    marketCenter && marketCenter?.users ? marketCenter?.users : [];
  const teamMemberCount = teamMembers ? teamMembers.length : "0";

  const userNameDifferent =
    formData?.name &&
    editingTeamMember?.name &&
    formData?.name.trim() !== editingTeamMember?.name;
  const userMarketCenterDifferent =
    formData?.marketCenter?.id !== editingTeamMember?.marketCenterId;
  const userRoleDifferent = formData?.role !== editingTeamMember?.role;
  const userEmailDifferent =
    formData?.email &&
    editingTeamMember?.email &&
    formData?.email.trim() !== editingTeamMember?.email;

  const noChangesToUser =
    !userNameDifferent &&
    !userMarketCenterDifferent &&
    !userRoleDifferent &&
    !userEmailDifferent;

  const getRoleIcon = (role: string) => {
    const Icon = ROLE_ICONS[role as keyof typeof ROLE_ICONS] || User;
    return <Icon className="h-4 w-4" />;
  };

  const getAuth0AccessToken = useCallback(async () => {
    if (process.env.NODE_ENV === "development") return "local";
    return await getAccessToken();
  }, []);

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
      console.log("response", response);
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

  // REMOVAL
  const openRemoveUserModal = (user: PrismaUser) => {
    setUserToRemove(user);
    setEditingTeamMember({} as PrismaUser);
    setShowRemoveUserForm(true);
  };

  const removeUserMutation = useMutation({
    mutationFn: async (user: PrismaUser) => {
      if (!marketCenter || !marketCenter?.id)
        throw new Error("Missing Market Center ID");

      const accessToken = await getAuth0AccessToken();
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
    onSuccess: (_, user) => {
      toast.success(`${user.name || "User"} was removed`);
      queryClient.invalidateQueries({
        queryKey: ["get-market-center", marketCenterId],
      });
    },
    onError: (error) => {
      console.error("Failed to remove user", error);
      toast.error("Failed to remove user");
    },
  });

  const handleRemoveUser = async (user: PrismaUser) => {
    if (!user) throw new Error("User data is missing");
    setIsSubmitting(true);
    removeUserMutation.mutate(user);
    setIsSubmitting(false);
    setUserToRemove({} as PrismaUser);
    setShowRemoveUserForm(false);
  };

  // TODO: USER UPDATE in AUth0 and Prisma
  // EOD Thursday 9/25: Auth0 Error -   {status: 400, statusText: 'Bad Request',}
  const openEditUserModal = (user: PrismaUser, marketCenter: MarketCenter) => {
    setEditingTeamMember(user);
    setFormData({
      name: user?.name,
      email: user?.email,
      marketCenter: marketCenter ?? {},
      role: user?.role,
    });
    setFormErrors({});
    setUserToRemove({} as PrismaUser);
    setShowEditUserForm(true);
  };

  const resetAndCloseEditUserForm = () => {
    setFormData({
      name: "",
      email: "",
      marketCenter: marketCenter ?? {},
      role: "AGENT",
    } as UpdateUserForm);
    setEditingTeamMember({} as PrismaUser);
    setFormErrors({});
  };

  // const validateEditUserForm = () => {
  //   const errors: Record<string, string> = {};
  //   if (noChangesToUser) {
  //     errors.general = "No changes were made";
  //   }
  //   if (!formData.name.trim()) errors.name = "Required";
  //   if (currentUser?.role === "ADMIN" && !formData.role)
  //     errors.role = "Required";
  //   if (!formData.email.trim()) {
  //     errors.email = "Required";
  //   } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
  //     errors.email = "Invalid email format";
  //   }

  //   setFormErrors(errors);
  //   return Object.keys(errors).length === 0;
  // };

  return (
    <div className="space-y-6">
      {/* Team Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Building className="h-5 w-5" />
                {marketCenter && marketCenter?.name && `${marketCenter.name} `}
                Market Center
              </CardTitle>
              <CardDescription className="font-medium">
                {marketCenter &&
                  marketCenter?.id &&
                  `#${marketCenter.id.slice(0, 8)} |`}{" "}
                Manage your team members, roles, and invitations
              </CardDescription>
            </div>
            {permissions?.canManageTeam && (
              <AddTeamMemberModal
                marketCenter={marketCenter}
                disabled={!marketCenter}
                getRoleIcon={getRoleIcon}
                sendUserUpdateNotification={sendUserUpdateNotification}
              />
            )}
          </div>
        </CardHeader>
      </Card>

      {/* ManagementTable  */}
      <Card>
        <CardHeader>
          <CardTitle>Current Team Members</CardTitle>
          <CardDescription>{teamMemberCount} Active Members</CardDescription>
        </CardHeader>
        <CardContent className="min-h-10 space-y-4">
          {!isLoading &&
            teamMembers &&
            teamMembers.length > 0 &&
            teamMembers.map((member, index) => {
              const self = member.id === currentUser?.id;
              const cannotUpdateAdmin =
                member.role === "ADMIN" && currentUser?.role !== "ADMIN";

              return (
                <UserListItem
                  key={member.id + index}
                  user={member}
                  onEdit={() => openEditUserModal(member, marketCenter)}
                  deleteLabel="Remove"
                  onDelete={() => openRemoveUserModal(member)}
                  disabled={
                    self || cannotUpdateAdmin || !permissions?.canManageTeam
                  }
                />
              );
            })}
          {!isLoading && (!teamMembers || !teamMembers.length) && (
            <p className="text-muted-foreground">
              No team members found. Start by inviting your first team member.
            </p>
          )}
          {isLoading && (
            <p className="text-muted-foreground">Loading team members... </p>
          )}
        </CardContent>
      </Card>

      {/* Role Information */}
      <Card>
        <CardHeader>
          <CardTitle>Role Permissions</CardTitle>
          <CardDescription>
            Understanding what each role can access and manage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {Object.entries(ROLE_DESCRIPTIONS).map(([role, description]) => (
              <div key={role} className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  {getRoleIcon(role)}
                  <Badge
                    variant={ROLE_COLORS[role as keyof typeof ROLE_COLORS]}
                  >
                    {role}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* EDIT TEAM MEMBER */}
      <Dialog open={showEditUserForm} onOpenChange={setShowEditUserForm}>
        <DialogClose onClick={resetAndCloseEditUserForm} />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editing {editingTeamMember.name}</DialogTitle>
            <DialogDescription>Press save when complete</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={() => console.log("Disabled")}
            className="space-y-4 py-4"
          >
            {/* NAME */}
            <div className="space-y-2">
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
                className={`${formErrors?.name && "border-destructive"}`}
              />
              <p className="text-sm text-destructive pt-1">
                {formErrors?.name && `${formErrors.name}`}
              </p>
            </div>
            {/* EMAIL */}
            <div className="space-y-2">
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
                className={`${formErrors?.email && "border-destructive"}`}
              />
              <p className="text-sm text-destructive pt-1">
                {formErrors?.email && `${formErrors.email}`}
              </p>
            </div>
            {/* MARKET CENTER */}
            <div className="space-y-2">
              <Label htmlFor="marketCenter" className="font-bold">
                Market Center:
              </Label>

              <Input
                id="marketCenter"
                value={formData?.marketCenter?.name || ""}
                disabled={true}
                className={`w-7/12 ${formErrors?.marketCenter && "border-destructive"}`}
              />
              <p className="text-sm text-destructive pt-1">
                {formErrors?.marketCenter && `${formErrors?.marketCenter}`}
              </p>
            </div>
            {/* USER ROLE */}
            <div className="space-y-2">
              <Label className="font-bold">User Role:</Label>
              <Select
                value={formData.role}
                onValueChange={(value: UserRole) =>
                  setFormData({ ...formData, role: value })
                }
                disabled={isSubmitting || !permissions?.canChangeUserRoles}
              >
                <SelectTrigger>
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
              <p className="text-sm text-destructive pt-1">
                {formErrors?.role && `${formErrors.role}`}
              </p>
            </div>

            <DialogFooter>
              <p className="text-sm text-destructive pt-1">
                {formErrors?.general && `${formErrors.general}`}
              </p>
              <Button
                type="button"
                disabled={true} //{isSubmitting}
                variant="outline"
                onClick={() => {
                  resetAndCloseEditUserForm();
                  setShowEditUserForm(false);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || noChangesToUser}>
                {isSubmitting ? "Saving..." : "Submit"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
              disabled={isSubmitting}
              variant="outline"
              onClick={() => setShowRemoveUserForm(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleRemoveUser(userToRemove)}
              variant="destructive"
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={isSubmitting || !permissions?.canManageTeam}
            >
              Remove Member
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
