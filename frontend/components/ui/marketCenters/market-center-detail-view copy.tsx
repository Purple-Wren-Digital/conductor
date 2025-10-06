"use client";

import { useCallback, useEffect, useState } from "react";
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
} from "@/components/ui/dialog/base-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
// import PagesAndItemsCount from "@/components/ui/pagination/page-and-items-count";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AddTeamMemberModal from "@/components/ui/marketCenters/market-center-add-user";
import { UserListItem } from "@/components/ui/list-item/user-list-item";
import { useFetchMarketCenter } from "@/hooks/use-market-center";
// import { useFetchUsersWithinMarketCenter } from "@/hooks/use-users";
import { API_BASE } from "@/lib/api/utils";
import { useUserRole } from "@/lib/hooks/use-user-role";
import type {
  MarketCenter,
  PrismaUser,
  OrderBy,
  UserRole,
  UserSortBy,
} from "@/lib/types";
import {
  ROLE_ICONS,
  roleOptions,
  ROLE_COLORS,
  ROLE_DESCRIPTIONS,
  calculateTotalPages,
  arraysEqualById,
} from "@/lib/utils";
import {
  ArrowLeft,
  Building,
  Edit2,
  Hash,
  Search,
  Tags,
  User,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import EditMarketCenter from "./market-center-edit-form";
import UserMultiSelectDropdown from "../multi-select/user-multi-select-dropdown";

interface MarketCenterDetailProps {
  marketCenterId: string;
}

type UpdateUserForm = {
  marketCenter: MarketCenter;
  role: UserRole;
  name: string;
  email: string;
};

export default function MarketCenterDetailView({
  marketCenterId,
}: MarketCenterDetailProps) {
  const router = useRouter();

  const queryClient = useQueryClient();

  const { currentUser } = useStore();
  const { role, permissions } = useUserRole();

  const { data: marketCenter, isLoading } = useFetchMarketCenter(
    role,
    marketCenterId
  );

  const teamMembers: PrismaUser[] = marketCenter?.users ?? ([] as PrismaUser[]); //usersData?.users ?? [];
  const teamCategories: any[] = marketCenter?.ticketCategories ?? [];
  // const [sortBy, setSortBy] = useState<UserSortBy>("updatedAt");
  // const [sortDir, setSortDir] = useState<OrderBy>("asc");

  // const [currentPage, setCurrentPage] = useState(1);
  // const [itemsPerPage] = useState(10);

  // const [searchQuery, setSearchQuery] = useState("");
  // const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // EDIT MARKET CENTER
  const [showEditMCForm, setShowEditMCForm] = useState(false);
  const [marketCenterFormData, setMarketCenterFormData] = useState({
    name: marketCenter?.name ?? ("" as string),
    selectedUsers: teamMembers as PrismaUser[],
    ticketCategories: teamCategories,
  });

  // EDIT USER
  const [showEditUserForm, setShowEditUserForm] = useState(false);
  const [editingTeamMember, setEditingTeamMember] = useState<PrismaUser>(
    {} as PrismaUser
  );
  const [formData, setFormData] = useState<UpdateUserForm>(
    {} as UpdateUserForm
  );
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [unassignedUsers, setUnassignedUsers] = useState<PrismaUser[]>([]);

  const [showRemoveUserForm, setShowRemoveUserForm] = useState(false);
  const [userToRemove, setUserToRemove] = useState<PrismaUser>(
    {} as PrismaUser
  );

  const invalidateMarketCenter = queryClient.invalidateQueries({
    queryKey: ["get-market-center", marketCenterId],
  });

  const totalTeamMembers = teamMembers ? teamMembers.length : 0;
  // const totalPages = calculateTotalPages({
  //   totalItems: totalTeamMembers,
  //   itemsPerPage,
  // });

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

  const handleSetSelectedOptions = (newSelected: PrismaUser[]) => {
    setMarketCenterFormData({
      ...marketCenterFormData,
      selectedUsers: newSelected,
    });
  };

  const getAuth0AccessToken = useCallback(async () => {
    if (process.env.NODE_ENV === "development") return "local";
    return await getAccessToken();
  }, []);

  // EDIT MARKET CENTER

  // const hasNameChanged: boolean =
  //   marketCenter &&
  //   ;

  // const haveAssignmentsChanged: boolean = ;
  // teamMembers.length !== marketCenterFormData?.selectedUsers.length ||
  // !arraysEqualById(teamMembers, marketCenterFormData.selectedUsers);

  const validateMarketCenterForm = () => {
    const errors: Record<string, string> = {};
    if (!marketCenterFormData.name.trim()) errors.name = "Name is required";
    // if (
    //   !marketCenterFormData.selectedUsers ||
    //   !marketCenterFormData.selectedUsers.length
    // ) {
    //   errors.users = "Select at least one user";
    // }

    const noUserUpdates = !arraysEqualById(
      teamMembers,
      marketCenterFormData.selectedUsers
    );

    // if (
    //   role === "ADMIN" &&
    //   marketCenterFormData.name.trim() === marketCenter?.name.trim() &&
    //   noUserUpdates
    // ) {
    //   errors.name = "Nothing to update";
    //   errors.users = "Nothing to update";
    // }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const updateMarketCenterMutation = useMutation({
    mutationFn: async () => {
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
            name: marketCenterFormData?.name,
            users: marketCenterFormData?.selectedUsers,
            ticketCategories: marketCenterFormData?.ticketCategories,
          }),
        }
      );
      console.log("UPDATE MARKET CENTER RESPONSE", response);

      if (!response.ok) throw new Error("Failed to update market center");
      const data = await response.json();

      console.log("UPDATE MARKET CENTER DATA: ", data);
      // if (data) await sendUserUpdateNotification(user, "removed");

      // return user;
    },
    onSuccess: () => {
      toast.success(`${marketCenterFormData?.name} was updated`);
      invalidateMarketCenter;
      setShowEditMCForm(false);
    },
    onError: (error) => {
      console.error("Failed to update market center", error);
      toast.error(`Failed to update ${marketCenterFormData?.name}`);
    },
  });

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
      // if (data) await sendUserUpdateNotification(user, "removed");

      return user;
    },
    onSuccess: (_, user) => {
      toast.success(`${user?.name} was removed`);
      invalidateMarketCenter;
    },
    onError: (error) => {
      console.error("Failed to remove user", error);
      toast.error("Failed to remove user");
    },
  });

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

  const fetchActiveUsers = useCallback(async () => {
    // setIsLoading(true);
    const params = !permissions?.canCreateUsers ? `?role=AGENT` : "";

    try {
      const accessToken = await getAuth0AccessToken();
      if (!accessToken) {
        throw new Error("No token fetched");
      }
      const response = await fetch(`${API_BASE}/users${params}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
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
      // setIsLoading(false);
    }
  }, [getAuth0AccessToken]);

  useEffect(() => {
    if (!showEditMCForm) return;
    fetchActiveUsers();
  }, [showEditMCForm]);

  // REMOVAL
  const openRemoveUserModal = (user: PrismaUser) => {
    setUserToRemove(user);
    setEditingTeamMember({} as PrismaUser);
    setShowRemoveUserForm(true);
  };

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

  const handleUpdateMarketCenter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateMarketCenterForm()) {
      toast.error("Invalid input(s)");
      return;
    }
    setIsSubmitting(true);
    updateMarketCenterMutation.mutate();
    setIsSubmitting(false);
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
      <div className="flex items-center gap-2 justify-between">
        <Button variant="ghost" onClick={() => router.back()} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowEditMCForm(true)}
            className="gap-2"
          >
            <Edit2 className="h-4 w-4" />
            Edit
          </Button>
        </div>
      </div>
      {/* TOP INFO */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Building className="h-5 w-5" />
                  {marketCenter &&
                    marketCenter?.name &&
                    `${marketCenter.name} `}
                  Market Center
                </CardTitle>
                <CardDescription className="font-medium">
                  Manage settings and team
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="flex items-center gap-2 text-sm">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  <p className="text-muted-foreground">ID:</p>
                  <p className="font-medium">
                    {marketCenter?.id
                      ? `${marketCenter?.id.slice(0, 8)}`
                      : "Not found"}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Users:</p>
                  <p className="font-medium">{totalTeamMembers}</p>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Tags className="h-4 w-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Categories:</p>
                  <p className="font-medium">{teamCategories.length ?? 0}</p>
                  {/* marketCenter?.settings?.categories.length ?? */}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CATEGORIES */}
        <Card className="lg:col-span-1">
          <CardHeader className="flex justify-between align-center">
            <div className="flex flex-row space-x-2 items-center justify-between">
              <div className="space-y-1">
                <CardTitle>Categories</CardTitle>
                <CardDescription>0 Active Categories</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium text-muted-foreground">
              Feature in progress
            </p>
            {/* EDIT CATEGORIES */}
          </CardContent>
        </Card>

        {/* TEAM  */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex justify-between align-center">
            <div className="flex flex-row space-x-2 items-center justify-between">
              <div className="space-y-1">
                <CardTitle>Team Members</CardTitle>
                <CardDescription>
                  {totalTeamMembers} Active Members
                </CardDescription>
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
                <p className="text-muted-foreground">
                  Loading team members...{" "}
                </p>
              )}
              {!isLoading &&
                // !usersLoading &&
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
                      onClick={() => {
                        console.log("CLICKED USER");
                        // TODO: router.push to user profile
                      }}
                      onDelete={() => openRemoveUserModal(member)}
                      // disabled={
                      //   self || cannotUpdateAdmin || !permissions?.canManageTeam
                      // }
                    />
                  );
                })}
              {!isLoading && (!teamMembers || !teamMembers.length) && (
                <p className="text-muted-foreground">
                  No team members found. Contact Admin if you haven't been
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
      </div>

      {/* EDIT MARKET CENTER */}
      <Dialog open={showEditMCForm} onOpenChange={setShowEditMCForm}>
        {/* <DialogClose onClick={() => resetAndCloseForm()} /> */}
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Editing Market Center #{marketCenter?.id.slice(0, 8)}
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
                value={marketCenterFormData.name}
                onChange={(e) =>
                  setMarketCenterFormData({
                    ...marketCenterFormData,
                    name: e.target.value,
                  })
                }
                placeholder="Enter Name"
                className={`mt-1 ${formErrors.name && "border-destructive"}`}
              />
              <p className="text-sm text-destructive">
                {formErrors?.marketCenterName && formErrors.marketCenterName}
              </p>
            </div>

            {/* USERS */}
            <div className="space-y-2 space-x-2 w-full">
              <label className="text-md font-medium">Team Assignments *</label>
              <div className="space-y-2 space-x-2 w-full">
                {marketCenterFormData.selectedUsers &&
                  marketCenterFormData.selectedUsers.length > 0 &&
                  marketCenterFormData.selectedUsers.map(
                    (selectedUser, index) => {
                      return (
                        <Badge key={index} variant="secondary">
                          <p className="text-md">{selectedUser.name}</p>
                        </Badge>
                      );
                    }
                  )}
              </div>

              <UserMultiSelectDropdown
                disabled={
                  !teamMembers || !teamMembers.length
                  //  &&(!unassignedUsers || !unassignedUsers.length)
                }
                marketCenterId={marketCenter?.id || null}
                placeholder={
                  marketCenterFormData.selectedUsers &&
                  marketCenterFormData.selectedUsers.length
                    ? `${marketCenterFormData.selectedUsers.length} users selected`
                    : teamMembers && teamMembers.length > 0
                      ? //  ||(unassignedUsers && unassignedUsers.length > 0)
                        "Add or remove users"
                      : "No available users found"
                }
                formFieldName="Users"
                options={[...teamMembers]} ///, ...unassignedUsers]}
                selectedOptions={marketCenterFormData.selectedUsers}
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
                  // resetAndCloseForm()
                  setShowEditMCForm(false);
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={isSubmitting} // || !hasNameChanged || !haveAssignmentsChanged}
              >
                {isSubmitting ? "Saving..." : "Submit"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT TEAM MEMBER */}
      {/* <Dialog open={showEditUserForm} onOpenChange={setShowEditUserForm}>
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
      {/* <div className="space-y-2">
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
            </div> */}
      {/* EMAIL */}
      {/* <div className="space-y-2">
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
      {/*    <div className="space-y-2">
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
      {/*       <div className="space-y-2">
              <Label className="font-bold">User Role:</Label>
              <Select
                value={formData.role}
                onValueChange={(value: UserRole) =>
                  setFormData({ ...formData, role: value })
                }
                disabled={isSubmitting} //  || !permissions?.canChangeUserRoles
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
      </Dialog> */}

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
