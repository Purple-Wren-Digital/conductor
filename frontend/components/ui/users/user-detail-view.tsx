"use client";

import type React from "react";
import { useState, useCallback } from "react";
import { getAccessToken } from "@auth0/nextjs-auth0";
import { useStore } from "@/app/store-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog/base-dialog";
import { Input } from "@/components/ui/input";
import { getRoleBadgeStyle } from "@/components/ui/list-item/base-list-item";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { useUserRole } from "@/lib/hooks/use-user-role";
import {
  MarketCenter,
  PrismaUser,
  TicketHistory,
  UserEditFormData,
  UserHistory,
  UserRole,
} from "@/lib/types";
import {
  capitalizeEveryWord,
  getRoleColor,
  ROLE_DESCRIPTIONS,
  ROLE_ICONS,
  roleOptions,
} from "@/lib/utils";
import {
  ArrowLeft,
  Building,
  Edit2,
  Hash,
  History,
  Mail,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useFetchOneUser } from "@/hooks/use-users";

//EACH TABLE TODO: PAGINATE + SORT + FILTER

type UserDetailViewProps = {
  id: string;
};

export default function UserDetailView({ id }: UserDetailViewProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: userData, isLoading: userLoading } = useFetchOneUser(id);
  const user: PrismaUser = userData ?? ({} as PrismaUser);
  const marketCenter: MarketCenter = userData?.marketCenter ?? {};

  // EDIT USER STATES
  const [showEditUserForm, setShowEditUserForm] = useState(false);
  const [formData, setFormData] = useState<UserEditFormData>({
    firstName: user && user?.name ? user?.name.split(" ")?.[0] : "",
    lastName: user && user?.name ? user?.name.split(" ")?.[1] : "",
    email: user?.email ?? "",
    role: user?.role ?? "AGENT",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { currentUser } = useStore();
  const { permissions } = useUserRole();

  const getAuth0AccessToken = useCallback(async () => {
    if (process.env.NODE_ENV === "development") return "local";
    return await getAccessToken();
  }, []);

  const getRoleIcon = (userRole: UserRole) => {
    const Icon = ROLE_ICONS[userRole as keyof typeof ROLE_ICONS];
    return Icon ? (
      <Icon className="h-4 w-4 text-muted-foreground" />
    ) : (
      <User className="h-4 w-4 text-muted-foreground" />
    );
  };

  const getRoleDescription = (userRole: UserRole) => {
    const description = ROLE_DESCRIPTIONS[userRole as keyof typeof ROLE_ICONS];
    return description;
  };

  const findChangedByName = (userId: string, name?: string) => {
    if (name) return name;
    if (!userId) return "No id";
    if (userId === user?.id) return user?.name;
    if (userId === currentUser?.id) return currentUser?.name;
    return userId.slice(0, 8);
  };

  const resetFormAndClose = () => {
    setFormErrors({});
    setShowEditUserForm(false);
  };
  const userNameForm = `${formData?.firstName.trim()} ${formData?.lastName.trim()}`;
  const hasNameChanged: boolean = user && userNameForm !== user?.name;
  const hasEmailChanged: boolean = formData?.email !== user?.email;
  const hasRoleChanged: boolean = formData?.role !== user?.role;

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData?.firstName.trim()) errors.name = "First name is required";
    if (!formData?.lastName.trim()) errors.lastName = "Last name is required";

    if (!formData?.email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData?.email)) {
      errors.email = "Invalid email format";
    }

    if (!formData.role) errors.role = "Role is required";

    if (!hasNameChanged && !hasEmailChanged && !hasRoleChanged)
      errors.general = "No changes made";

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const updateUserMutation = useMutation({
    mutationFn: async (userId?: string) => {
      if (!userId) throw new Error("Missing editing user ID");

      const accessToken = await getAuth0AccessToken();
      const response = await fetch(`/api/users/${userId}/update`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          name: `${formData?.firstName} ${formData?.lastName}`,
          email: formData?.email,
          role: formData?.role,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to update user`);
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["user-profile", id],
      });
      resetFormAndClose();
      toast.success(`${user?.name || "User"} was updated`);
    },
    onError: (error) => {
      console.error("Failed to update user", error);
      toast.error("Failed to update user");
    },
  });

  const handleSubmitEditUserForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!permissions?.canManageAllUsers) {
      toast.error("You do not have permission to update users");
      return;
    }
    if (!validateForm()) return;
    setIsSubmitting(true);
    updateUserMutation.mutate(user?.id);
    setIsSubmitting(false);
  };

  const handleRoleChange = async () => {
    if (!permissions?.canManageAllUsers) {
      toast.error("You do not have permission to update users");
      return;
    }
    setIsSubmitting(true);
    updateUserMutation.mutate(user?.id);
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-6">
      {/* TOP INFO */}
      <div className="flex items-center gap-2 justify-between">
        <Button
          variant="ghost"
          onClick={() => router.push("/dashboard/users?tab=users")}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Users
        </Button>
        <div className="ml-auto">
          <Button
            variant="outline"
            onClick={() => setShowEditUserForm(true)}
            className="gap-2"
          >
            <Edit2 className="h-4 w-4" /> Edit User
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* USER INFO */}
        <Card className="lg:col-span-2 ">
          <CardHeader>
            <CardTitle className="text-xl">{user?.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Email:</p>
                  <p className="font-medium">{user?.email}</p>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Market Center:</p>
                  <p className="font-medium">
                    {marketCenter?.name ?? "Not Assigned"}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  <p className="text-muted-foreground">User ID:</p>
                  <p className="font-medium">
                    {user?.id ? `${user?.id.slice(0, 8)}` : "Not found"}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  {getRoleIcon(user?.role)}
                  <p className="text-muted-foreground">Role:</p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      {/* <p className="font-medium">{user?.role}</p> */}
                      <Badge
                        variant={getRoleColor(user?.role || "AGENT")}
                        style={getRoleBadgeStyle(user?.role || "AGENT")}
                        title={user?.role}
                        className="text-xs px-2 py-0.5"
                      >
                        {user?.role}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      {getRoleDescription(user?.role)}
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        {/* QUICK EDITS */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Quick Edit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Role *</label>
              <Select
                value={user?.role}
                onValueChange={(value: UserRole) => {
                  setFormData({ ...formData, role: value });
                  handleRoleChange();
                }}
                disabled={
                  !permissions?.canChangeUserRoles ||
                  isSubmitting ||
                  userLoading
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((role) => (
                    <SelectItem key={role} value={role}>
                      <div className="flex items-center gap-2">
                        {getRoleIcon(role)}
                        {role}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* <div className="space-y-2">
                    <label className="text-sm font-medium">Market Center</label>
                    <TeamSwitcher
                      type="User Profile"
                      selectedMarketCenterId={selectedMarketCenterId}
                      setSelectedMarketCenterId={setSelectedMarketCenterId}
                      handleUpdateMarketCenter={handleUpdateMarketCenter}
                    />  
              </div>*/}
          </CardContent>
        </Card>

        {/* USER ACTIVITY */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-10">
              {/* TICKETS */}
              <h5 className="text-md font-bold mb-4">Tickets</h5>
              <Table className="border rounded">
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Updated Data</TableHead>
                    <TableHead>Previous Data</TableHead>
                    <TableHead>Changed By</TableHead>
                    <TableHead>Changed On</TableHead>
                    {/* <TableHead className="text-center">Snapshot</TableHead> */}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {user &&
                    user?.ticketHistory &&
                    user?.ticketHistory.length > 0 &&
                    user?.ticketHistory.map(
                      (entry: TicketHistory, index: number) => {
                        return (
                          <TableRow key={entry.id + index}>
                            {/* TICKET */}
                            <TableCell
                              className="cursor-pointer"
                              onClick={() =>
                                router.push(
                                  `/dashboard/tickets/${entry?.ticketId}`
                                )
                              }
                            >
                              <p className="font-semibold hover:underline pointer-events-auto">
                                # {entry?.id.slice(0, 8)}
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
                                {capitalizeEveryWord(
                                  entry?.newValue.replace("_", " ")
                                )}
                              </p>
                            </TableCell>
                            {/* OLD VALUE */}
                            <TableCell>
                              <p>
                                {capitalizeEveryWord(
                                  entry?.previousValue.replace("_", " ")
                                )}
                              </p>
                            </TableCell>
                            {/* CHANGED BY */}
                            <TableCell>
                              {index === 0 ? (
                                <p className="font-medium">{user?.name}</p>
                              ) : (
                                <p className="font-medium"></p>
                              )}
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

              {/* OTHER USERS */}
              <h5 className="text-md font-bold mt-4 mb-4">Other Users</h5>
              <Table className="border rounded">
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Updated Data</TableHead>
                    <TableHead>Previous Data</TableHead>
                    <TableHead>Changed By</TableHead>
                    <TableHead>Changed On</TableHead>
                    {/* <TableHead className="text-center">Snapshot</TableHead> */}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {user &&
                    user?.otherUsersChanges &&
                    user?.otherUsersChanges.length > 0 &&
                    user?.otherUsersChanges.map(
                      (entry: UserHistory, index: number) => {
                        const self = user?.id === entry?.userId;
                        if (self) return null;
                        return (
                          <TableRow key={entry.id + index}>
                            {/* OTHER USER */}
                            <TableCell
                              className="cursor-pointer"
                              onClick={() => {
                                if (self) {
                                  toast.warning(
                                    "Already viewing user's details"
                                  );
                                  return;
                                }
                                router.push(
                                  `/dashboard/users/${entry?.userId}`
                                );
                              }}
                            >
                              <p className="font-semibold hover:underline pointer-events-auto">
                                {/* # {entry?.id.slice(0, 8)} */}
                                <p>
                                  {findChangedByName(
                                    entry?.changedById,
                                    entry?.changedBy?.name
                                  )}
                                </p>
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
                                {capitalizeEveryWord(
                                  entry?.newValue.replace("_", " ")
                                )}
                              </p>
                            </TableCell>
                            {/* OLD VALUE */}
                            <TableCell>
                              <p>
                                {capitalizeEveryWord(
                                  entry?.previousValue.replace("_", " ")
                                )}
                              </p>
                            </TableCell>
                            {/* CHANGED BY */}
                            <TableCell
                              className="cursor-pointer"
                              onClick={() => {
                                if (self) {
                                  toast.warning(
                                    "Already viewing user's details"
                                  );
                                  return;
                                }
                                router.push(
                                  `/dashboard/users/${entry?.userId}`
                                );
                              }}
                            >
                              {index === 0 ? (
                                <p className="font-medium">{user?.name}</p>
                              ) : (
                                <p className="font-medium"></p>
                              )}
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

        {/* USER HISTORY */}
        <div className="lg:col-span-3">
          <Card className="bg-muted">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">User Updates</CardTitle>
              <Button variant="ghost">
                <History className="w-4 h-4" />
                View All
              </Button>
            </CardHeader>
            <CardContent>
              <Table className="border rounded">
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Updated Data</TableHead>
                    <TableHead>Previous Data</TableHead>
                    <TableHead>Changed By</TableHead>
                    <TableHead>Changed On</TableHead>

                    {/* <TableHead className="text-center">SnapShot</TableHead> */}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {user &&
                    user?.userHistory &&
                    user?.userHistory.length > 0 &&
                    user?.userHistory.map(
                      (entry: UserHistory, index: number) => {
                        const self = user?.id === entry?.userId;
                        return (
                          <TableRow key={entry.id + index}>
                            {/* User */}
                            <TableCell>
                              {index === 0 ? (
                                <p className="font-semibold">{user?.name}</p>
                              ) : (
                                <p className="font-semibold"></p>
                              )}
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
                                {capitalizeEveryWord(
                                  entry?.newValue.replace("_", " ")
                                )}
                              </p>
                            </TableCell>
                            {/* OLD VALUE */}
                            <TableCell>
                              <p>
                                {capitalizeEveryWord(
                                  entry?.previousValue.replace("_", " ")
                                )}
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
                              <p>
                                {findChangedByName(
                                  entry?.changedById,
                                  entry?.changedBy?.name
                                )}
                                {/* `#${entry?.changedById}` */}
                              </p>
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
                            {/* SNAPSHOT */}
                            {/* <TableCell className="items-center justify-center">
                              <div className="flex gap-2 items-center justify-center">
                                <Eye className="h-4 w-4" />
                                <p>View</p>
                              </div>
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
      </div>

      {/* EDIT USER */}
      <Dialog open={showEditUserForm} onOpenChange={setShowEditUserForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmitEditUserForm} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="firstName" className="text-sm font-medium">
                First Name *
              </label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    firstName: e.target.value,
                  })
                }
                placeholder="Enter first name"
                className={formErrors.firstName ? "border-destructive" : ""}
              />

              <p className="text-sm text-destructive">
                {formErrors?.firstName && formErrors.firstName}
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="lastName" className="text-sm font-medium">
                Last Name *
              </label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    lastName: e.target.value,
                  })
                }
                placeholder="Enter last name"
                className={formErrors.lastName ? "border-destructive" : ""}
              />
              <p className="text-sm text-destructive">
                {formErrors?.lastName && formErrors.lastName}
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email Address *
              </label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    email: e.target.value,
                  })
                }
                placeholder="Enter email address"
                className={formErrors.email ? "border-destructive" : ""}
                disabled
              />
              <p className="text-sm text-destructive">
                {formErrors?.email && formErrors.email}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Role *</label>
              <Select
                value={formData.role}
                onValueChange={(value: UserRole) =>
                  setFormData({ ...formData, role: value })
                }
                disabled={!permissions?.canChangeUserRoles}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((role) => (
                    <SelectItem key={role} value={role}>
                      <div className="flex items-center gap-2">
                        {getRoleIcon(role)}
                        {role}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <p className="text-sm text-destructive">
                {formErrors?.general && formErrors.general}
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEditUserForm(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  isSubmitting ||
                  !user ||
                  (!hasNameChanged && !hasEmailChanged && !hasRoleChanged)
                }
              >
                {isSubmitting ? "Saving..." : "Update User"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
