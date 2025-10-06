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
// import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
// import AddTeamMemberModal from "@/components/ui/marketCenters/market-center-add-user";
import EditMarketCenter from "@/components/ui/marketCenters/market-center-edit-form";
// import PagesAndItemsCount from "@/components/ui/pagination/page-and-items-count";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserListItem } from "@/components/ui/list-item/user-list-item";
import { useFetchMarketCenter } from "@/hooks/use-market-center";
import { API_BASE } from "@/lib/api/utils";
import { useUserRole } from "@/lib/hooks/use-user-role";
import type {
  MarketCenter,
  PrismaUser,
  OrderBy,
  UserRole,
  UserSortBy,
  MarketCenterHistory,
  MarketCenterForm,
} from "@/lib/types";
import {
  ROLE_ICONS,
  roleOptions,
  ROLE_COLORS,
  ROLE_DESCRIPTIONS,
  calculateTotalPages,
  arraysEqualById,
  capitalizeEveryWord,
} from "@/lib/utils";
import {
  ArrowLeft,
  Building,
  CircleMinus,
  CirclePlus,
  Clipboard,
  Edit2,
  Hash,
  History,
  Mailbox,
  SquarePen,
  // Search,
  Tags,
  Trash2,
  // User,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

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

  const [showMarketCenterHistory, setShowMarketCenterHistory] = useState(false);

  // EDIT MARKET CENTER
  const [showEditMCForm, setShowEditMCForm] = useState(false);
  const [marketCenterFormData, setMarketCenterFormData] = useState<MarketCenterForm>({
    name: marketCenter?.name ?? ("" as string),
    selectedUsers: teamMembers as PrismaUser[],
    ticketCategories: teamCategories,
  });

  // EDIT USER
  // const [showEditUserForm, setShowEditUserForm] = useState(false);
  // const [editingTeamMember, setEditingTeamMember] = useState<PrismaUser>(
  //   {} as PrismaUser
  // );
  // const [formData, setFormData] = useState<UpdateUserForm>(
  //   {} as UpdateUserForm
  // );
  // const [formErrors, setFormErrors] = useState<Record<string, string>>({});
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

  const findChangedByName = (userId: string, name?: string) => {
    if (name) return name;
    if (!userId) return "No id";
    // if (userId === user?.id) return user?.name;
    if (userId === currentUser?.id) return currentUser?.name;
    return userId.slice(0, 8);
  };

  const getAuth0AccessToken = useCallback(async () => {
    if (process.env.NODE_ENV === "development") return "local";
    return await getAccessToken();
  }, []);


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

  // const sendUserUpdateNotification = async (
  //   data: PrismaUser,
  //   userUpdate: "added" | "removed"
  // ) => {
  //   const body = {
  //     userUpdate: userUpdate,
  //     marketCenter: marketCenter,
  //     userName: data?.name,
  //     userEmail: data?.email,
  //     editorName: currentUser?.name,
  //     editorEmail: currentUser?.email,
  //   };
  //   try {
  //     const response = await fetch("/api/send/marketCenters/addUser", {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       cache: "no-store",
  //       body: JSON.stringify({ body }),
  //     });
  //     console.log("response", response);
  //     if (!response || !response.ok)
  //       throw new Error(
  //         response?.statusText
  //           ? response?.statusText
  //           : "Failed to send user update email"
  //       );
  //   } catch (error) {
  //     console.error("Failed to send team member update", error);
  //   }
  // };

  const getActionIcon = (action: string) => {
    switch (action.toUpperCase()) {
      case "CREATE":
        return <Clipboard className="h-3 w-3" />;
      case "UPDATE":
        return <SquarePen className="h-3 w-3" />;
      case "DELETE":
        return <Trash2 className="h-3 w-3" />;
      case "INVITE":
        return <Mailbox className="h-3 w-3" />;
      case "ADD":
        return <CirclePlus className="h-3 w-3" />;
      case "REMOVE":
        return <CircleMinus className="h-3 w-3" />;
      // case "ROLE CHANGE":
      //   return <ArrowRightLeft className="h-4 w-4" />;
      default:
        return <Clipboard className="h-3 w-3" />;
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
    // setEditingTeamMember({} as PrismaUser);
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
  // const openEditUserModal = (user: PrismaUser, marketCenter: MarketCenter) => {
  //   setEditingTeamMember(user);
  //   setFormData({
  //     name: user?.name,
  //     email: user?.email,
  //     marketCenter: marketCenter ?? {},
  //     role: user?.role,
  //   });
  //   setFormErrors({});
  //   setUserToRemove({} as PrismaUser);
  //   setShowEditUserForm(true);
  // };

  // const resetAndCloseEditUserForm = () => {
  //   setFormData({
  //     name: "",
  //     email: "",
  //     marketCenter: marketCenter ?? {},
  //     role: "AGENT",
  //   } as UpdateUserForm);
  //   setEditingTeamMember({} as PrismaUser);
  //   setFormErrors({});
  // };

  // const handleUpdateMarketCenter = async (e: React.FormEvent) => {
  //   e.preventDefault();
  //   if (!validateMarketCenterForm()) {
  //     toast.error("Invalid input(s)");
  //     return;
  //   }
  //   setIsSubmitting(true);
  //   updateMarketCenterMutation.mutate();
  //   setIsSubmitting(false);
  // };

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
            onClick={() => setShowMarketCenterHistory(!showMarketCenterHistory)}
            className="gap-2"
          >
            <History className="h-4 w-4" />
            View Recent History
          </Button>
          <Button
            // variant="outline"
            onClick={() => setShowEditMCForm(true)}
            className="gap-2"
          >
            <Edit2 className="h-4 w-4" />
            Edit Market center
          </Button>
        </div>
      </div>
      {/* TOP INFO */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* MARKET CENTER ACTIVITY */}

        {showMarketCenterHistory && (
          <div className="lg:col-span-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <Table className="border rounded">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Action</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Updated Data</TableHead>
                      <TableHead>Previous Data</TableHead>
                      <TableHead>Changed By</TableHead>
                      <TableHead>Changed On</TableHead>
                      {/* <TableHead className="text-center">Snapshot</TableHead> */}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {marketCenter &&
                      marketCenter?.marketCenterHistory &&
                      marketCenter?.marketCenterHistory.length > 0 &&
                      marketCenter?.marketCenterHistory.map(
                        (entry: MarketCenterHistory, index: number) => {
                          const teamNewValue =
                            entry?.field === "team" && entry?.newValue;
                          const teamChangeNewValue =
                            teamNewValue && JSON.parse(entry.newValue);

                          const teamPrevValue =
                            entry?.field === "team" && entry?.previousValue;
                          const teamChangePrevValue =
                            teamPrevValue && JSON.parse(entry.previousValue);
                          return (
                            <TableRow key={entry.id + index}>
                              {/* ACTION */}
                              <TableCell
                                className="cursor-pointer flex  gap-2 items-center"
                                onClick={() => {
                                  router.push(
                                    `/dashboard/users/${entry?.changedById}`
                                  );
                                }}
                              >
                                {getActionIcon(entry?.action)}
                                <p className="font-semibold hover:underline pointer-events-auto">
                                  {capitalizeEveryWord(entry?.action)}
                                </p>
                              </TableCell>
                              {/* FIELD */}
                              <TableCell>
                                <p className="font-semibold">
                                  {capitalizeEveryWord(entry?.field)}
                                </p>
                              </TableCell>
                              {/* NEW VALUE */}
                              <TableCell>
                                <p className="font-medium">
                                  {entry?.field === "team" &&
                                    entry?.newValue &&
                                    teamChangeNewValue?.name}

                                  {entry?.field !== "team" &&
                                    entry?.newValue &&
                                    capitalizeEveryWord(
                                      entry?.newValue.replace("_", " ")
                                    )}
                                </p>
                              </TableCell>
                              {/* OLD VALUE */}
                              <TableCell>
                                <p>
                                  {entry?.field === "team" &&
                                    entry?.previousValue &&
                                    teamChangePrevValue?.name}

                                  {entry?.field !== "team" &&
                                    entry?.previousValue &&
                                    capitalizeEveryWord(
                                      entry?.previousValue.replace("_", " ")
                                    )}
                                  {/* {entry?.previousValue &&
                                  capitalizeEveryWord(
                                    entry?.previousValue.replace("_", " ")
                                  )} */}
                                </p>
                              </TableCell>
                              {/* CHANGED BY */}
                              <TableCell
                                className="cursor-pointer"
                                onClick={() => {
                                  router.push(
                                    `/dashboard/users/${entry?.changedById}`
                                  );
                                }}
                              >
                                <p className="font-medium">
                                  {entry?.changedBy?.name ??
                                    findChangedByName(entry?.changedById)}
                                </p>
                                <p className="font-medium"></p>
                              </TableCell>
                              {/* CHANGED ON */}
                              <TableCell>
                                <p>
                                  {entry?.changedAt
                                    ? new Date(
                                        entry?.changedAt
                                      ).toLocaleDateString()
                                    : "-"}
                                </p>
                              </TableCell>
                              {/* SNAPSHOT OR GO TO TICKET */}
                              {/* <TableCell className="items-center justify-center">
                              <Link href={`/dashboard/tickets/${entry?.id}`}>
                                <div className="flex gap-2 items-center justify-center">
                                  <Eye className="h-4 w-4" />
                                  <p>View</p>
                                </div>
                              </Link>
                            </TableCell> */}
                            </TableRow>
                          );
                        }
                      )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* MARKET CENTER INFO */}
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
                      onEdit={() =>
                        router.push(`/dashboard/users/${member.id}`)
                      }
                      deleteLabel="Remove"
                      onClick={() =>
                        router.push(`/dashboard/users/${member.id}`)
                      }
                      onDelete={() => openRemoveUserModal(member)}
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
      {/* <Dialog open={showEditMCForm} onOpenChange={setShowEditMCForm}>
        {/* <DialogClose onClick={() => resetAndCloseForm()} /> */}
      {/* <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Editing Market Center #{marketCenter?.id.slice(0, 8)}
            </DialogTitle>
          </DialogHeader>

          <form className="space-y-3" onSubmit={handleUpdateMarketCenter}> */}
      {/* NAME */}
      {/* <div className="space-y-2">
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
            </div> */}

      {/* USERS */}
      {/* <div className="space-y-2 space-x-2 w-full">
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
                   &&(!unassignedUsers || !unassignedUsers.length)
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
            </div> */}

      {/* <div className="flex items-center justify-end gap-3 pt-4 border-t">
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
            </div> */}
      {/* </form> */}
      {/* </DialogContent>
      </Dialog> */}

      <EditMarketCenter
        editingMarketCenter={marketCenter}
        showEditMCForm={showEditMCForm}
        setShowEditMCForm={setShowEditMCForm}
        assignedUsers={teamMembers}
        unassignedUsers={unassignedUsers}
        formData={marketCenterFormData}
        setFormData={setMarketCenterFormData}
        refreshMarketCenters={invalidateMarketCenter}
        refreshUsers={fetchActiveUsers}
      />

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
