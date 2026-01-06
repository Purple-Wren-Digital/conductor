"use client";

import { Dispatch, SetStateAction, useCallback, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog/base-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { ToolTip } from "@/components/ui/tooltip/tooltip";
import { Calendar, InfoIcon, Plus } from "lucide-react";
import { useUserRole } from "@/hooks/use-user-role";
import type {
  MarketCenter,
  MarketCenterNotificationCallback,
  PrismaUser,
  TicketCategory,
  UsersToNotify,
} from "@/lib/types";
import { createAndSendNotification } from "@/lib/utils/notifications";
import { API_BASE } from "@/lib/api/utils";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";

export default function MarketCenterTicketCategories({
  marketCenter,
  isLoading,
  setIsLoading,
  invalidateMarketCenter,
}: {
  marketCenter: MarketCenter;
  isLoading: boolean;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  invalidateMarketCenter: () => void;
}) {
  const { user: clerkUser } = useUser();
  const [showRemoveCategory, setShowRemoveCategory] = useState(false);
  const [categoryToRemove, setCategoryToRemove] =
    useState<TicketCategory | null>(null);

  const [openCategoryForm, setOpenCategoryForm] = useState(false);
  const [editingTicketCategory, setEditingTicketCategory] =
    useState<TicketCategory | null>(null);

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [categoryFormData, setCategoryFormData] = useState({
    name: "",
    description: "",
    defaultAssigneeId: "none",
  });

  const { permissions } = useUserRole();
  const { getToken } = useAuth();

  const router = useRouter();

  const teamMembers: PrismaUser[] =
    marketCenter && marketCenter?.users
      ? marketCenter.users
      : ([] as PrismaUser[]);

  const ticketCategories: TicketCategory[] =
    marketCenter?.ticketCategories ?? ([] as TicketCategory[]);

  const resetAndCloseForm = () => {
    setOpenCategoryForm(false);
    setFormErrors({});
    setEditingTicketCategory(null);
    setCategoryFormData({
      name: "",
      description: "",
      defaultAssigneeId: "none",
    });
    setCategoryToRemove(null);
    setShowRemoveCategory(false);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!categoryFormData?.name || !categoryFormData?.name.trim()) {
      errors.name = "Name is required";
    }

    const defaultAssigneeFormValue =
      categoryFormData?.defaultAssigneeId === "none"
        ? ""
        : categoryFormData?.defaultAssigneeId;
    if (
      editingTicketCategory &&
      categoryFormData?.name === editingTicketCategory?.name &&
      categoryFormData?.description === editingTicketCategory?.description &&
      defaultAssigneeFormValue === editingTicketCategory?.defaultAssigneeId
    ) {
      errors.general = "No changes were made";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const formatUpdateBody = () => {
    const formattedBody: any = {};
    if (editingTicketCategory?.name !== categoryFormData?.name.trim()) {
      formattedBody.name = categoryFormData?.name.trim();
    }
    if (
      editingTicketCategory?.description !==
      categoryFormData?.description.trim()
    ) {
      formattedBody.description = categoryFormData?.description.trim();
    }

    const defaultAssigneeFormValue =
      categoryFormData?.defaultAssigneeId !== "none"
        ? categoryFormData?.defaultAssigneeId
        : "none";
    if (editingTicketCategory?.defaultAssigneeId !== defaultAssigneeFormValue) {
      formattedBody.defaultAssigneeId = defaultAssigneeFormValue;
    }
    return formattedBody;
  };

  const handleSendMarketCenterNotifications = useCallback(
    async ({
      templateName,
      trigger,
      receivingUser,
      data,
    }: MarketCenterNotificationCallback) => {
      try {
        const response = await createAndSendNotification({
          getToken: getToken,
          templateName: templateName,
          trigger: trigger,
          receivingUser: receivingUser,
          data: data,
        });
      } catch (error) {
        console.error(
          "MarketCenterTicketCategories - Unable to generate notifications",
          error
        );
      }
    },
    [getToken]
  );

  const updateTicketCategoryMutation = useMutation({
    mutationFn: async () => {
      if (!editingTicketCategory || !editingTicketCategory?.id) {
        throw new Error("No editing");
      }

      const body = formatUpdateBody();
      if (!body) {
        setFormErrors({ general: "To submit, please make edits" });
        return;
      }
      const token = await getToken();
      if (!token) {
        throw new Error("Failed to get authentication token");
      }
      const response = await fetch(
        `${API_BASE}/marketCenters/ticketCategories/${editingTicketCategory?.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        }
      );
      if (!response.ok) {
        throw new Error(
          response?.statusText
            ? response.statusText
            : "Failed to update ticket category"
        );
      }
      const data = await response.json();
      if (!data || !data?.category) {
        throw new Error("Failed to update ticket category");
      }
      return data;
    },
    onSuccess: async (data: {
      category: TicketCategory;
      usersToNotify: UsersToNotify[];
    }) => {
      toast.success(`${categoryFormData?.name} updated`);
      if (data?.usersToNotify && data?.usersToNotify.length > 0) {
        await Promise.all(
          data.usersToNotify.map(async (user) => {
            await handleSendMarketCenterNotifications({
              templateName: "Category Assignment",
              trigger: "Category Assignment",
              receivingUser: {
                id: user?.id,
                name: user?.name ?? "You",
                email: user?.email ?? "",
              },
              data: {
                categoryAssignment: {
                  userUpdate: user?.updateType,
                  userName: user?.name ?? "You",
                  categoryName: data?.category?.name,
                  categoryDescription: data?.category?.description ?? undefined,
                  marketCenterId: data?.category?.marketCenterId,
                  marketCenterName: data?.category?.marketCenter?.name,
                  editorName: clerkUser?.fullName ?? "Another user",
                  editorEmail:
                    clerkUser?.emailAddresses[0]?.emailAddress ?? "N/A",
                },
              },
            });
          })
        );
      }
      setIsLoading(false);
      resetAndCloseForm();
    },
    onError: (error) => {
      console.error("Failed to update category", error);
      toast.error("Failed to update category");
    },
    onSettled: () => {
      setIsLoading(false);
      invalidateMarketCenter();
    },
  });

  const createTicketCategoryMutation = useMutation({
    mutationFn: async () => {
      if (!marketCenter || !marketCenter?.id)
        throw new Error("Missing Market Center ID");

      const token = await getToken();
      if (!token) {
        throw new Error("Failed to get authentication token");
      }
      const response = await fetch(
        `${API_BASE}/marketCenters/ticketCategories`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            marketCenterId: marketCenter.id,
            name: categoryFormData?.name ?? "",
            description: categoryFormData?.description ?? null,
            defaultAssigneeId:
              categoryFormData?.defaultAssigneeId === "none"
                ? undefined
                : (categoryFormData?.defaultAssigneeId ?? undefined),
          }),
        }
      );
      if (!response.ok) {
        throw new Error(
          response?.statusText
            ? response.statusText
            : "Failed to create ticket category"
        );
      }

      const data = await response.json();
      if (!data || !data?.category) {
        throw new Error("Failed to create ticket category");
      }
      return data.category;
    },
    onSuccess: async (data: TicketCategory) => {
      toast.success(`${categoryFormData?.name} was created`);
      if (data?.defaultAssigneeId && data?.defaultAssignee) {
        await handleSendMarketCenterNotifications({
          templateName: "Category Assignment",
          trigger: "Category Assignment",
          receivingUser: {
            id: data?.defaultAssigneeId,
            name: data?.defaultAssignee?.name ?? "You",
            email: data?.defaultAssignee?.email ?? "",
          },
          data: {
            categoryAssignment: {
              userUpdate: "added",
              userName: data?.defaultAssignee?.name ?? "You",
              categoryName: data?.name,
              categoryDescription: data?.description ?? undefined,
              marketCenterId: data?.marketCenterId,
              marketCenterName: marketCenter?.name,
              editorName: clerkUser?.fullName ?? "Another user",
              editorEmail: clerkUser?.emailAddresses[0]?.emailAddress ?? "N/A",
            },
          },
        });
      }
      setIsLoading(false);
      resetAndCloseForm();
    },
    onError: (error) => {
      console.error(`Failed to create category`, error);
      toast.error(`Failed to create category`);
    },
    onSettled: () => {
      setIsLoading(false);
      invalidateMarketCenter();
    },
  });

  const handleTicketCategoryForm = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!permissions?.canManageTeam) {
      toast.error("You do not have permission to manage ticket categories");
      return;
    }
    setFormErrors({});
    if (!validateForm()) {
      toast.error("Invalid input(s)");
      return;
    }
    setIsLoading(true);
    if (editingTicketCategory && editingTicketCategory?.id) {
      updateTicketCategoryMutation.mutate();
    } else {
      createTicketCategoryMutation.mutate();
    }
  };

  const deleteTicketCategoryMutation = useMutation({
    mutationFn: async () => {
      if (!categoryToRemove || !categoryToRemove?.id) {
        throw new Error("Missing ID");
      }

      const token = await getToken();
      if (!token) {
        throw new Error("Failed to get authentication token");
      }
      const response = await fetch(
        `${API_BASE}/marketCenters/ticketCategories/${categoryToRemove.id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!response.ok) {
        throw new Error(
          response?.statusText
            ? response.statusText
            : "Failed to delete ticket category"
        );
      }
    },
    onSuccess: async () => {
      toast.success(`${categoryToRemove?.name} was deleted`);
      setIsLoading(false);
      if (
        categoryToRemove?.defaultAssigneeId &&
        categoryToRemove?.defaultAssignee
      ) {
        await handleSendMarketCenterNotifications({
          templateName: "Category Assignment",
          trigger: "Category Assignment",
          receivingUser: {
            id: categoryToRemove?.defaultAssigneeId,
            name: categoryToRemove?.defaultAssignee?.name ?? "You",
            email: categoryToRemove?.defaultAssignee?.email ?? "",
          },
          data: {
            categoryAssignment: {
              userUpdate: "removed",
              userName: categoryToRemove?.defaultAssignee?.name ?? "You",
              categoryName: categoryToRemove?.name,
              categoryDescription: categoryToRemove?.description ?? undefined,
              marketCenterId: categoryToRemove?.marketCenterId,
              marketCenterName: marketCenter?.name,
              editorName: clerkUser?.fullName ?? "Another user",
              editorEmail: clerkUser?.emailAddresses[0]?.emailAddress ?? "N/A",
            },
          },
        });
      }
      resetAndCloseForm();
    },
    onError: (error) => {
      console.error(`Failed to delete category`, error);
      toast.error(`Failed to delete category`);
    },
    onSettled: () => {
      setIsLoading(false);
      invalidateMarketCenter();
    },
  });
  const handleRemoveTicketCategory = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!permissions?.canManageTeam) {
      toast.error("You do not have permission to manage ticket categories");
      return;
    }
    setFormErrors({});
    setIsLoading(true);
    deleteTicketCategoryMutation.mutate();
    setIsLoading(false);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-wrap flex-row gap-4 mb-3 items-center justify-center sm:justify-between ">
          <CardTitle>
            Ticket Categories ({ticketCategories?.length ?? 0})
          </CardTitle>
          <Button
            disabled={
              isLoading || !permissions?.canManageMarketCenterCategories
            }
            onClick={() => setOpenCategoryForm(true)}
          >
            <Plus />
            Add Category
          </Button>
        </CardHeader>
        <CardContent
          className={`space-y-4 transition-opacity duration-300 
              ${isLoading ? "opacity-50 pointer-events-none" : "opacity-100"}`}
        >
          <Table>
            <TableHeader className="bg-muted">
              <TableRow className="border rounded">
                <TableHead className="text-black">Category Name</TableHead>
                <TableHead className="text-black">Description</TableHead>
                <TableHead className="text-black">Default Assignee</TableHead>
                <TableHead className="text-black text-center">
                  Updated
                </TableHead>

                <TableHead className="text-black text-center">
                  Tickets
                </TableHead>
                <TableHead className="text-center text-black">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <>
                  {[...Array(5)].map((_, i) => (
                    <TableRow
                      key={i}
                      className="h-16 w-full bg-muted rounded animate-pulse"
                    >
                      <TableCell colSpan={5} className="py-8">
                        <div className="h-4 w-full bg-muted rounded animate-pulse" />
                      </TableCell>
                    </TableRow>
                  ))}
                </>
              )}
              {ticketCategories &&
                ticketCategories.length > 0 &&
                ticketCategories.map(
                  (category: TicketCategory, index: number) => {
                    const deactivatedUser =
                      !category?.defaultAssignee?.isActive;
                    const wrongMarketCenter =
                      category?.defaultAssignee?.marketCenterId !==
                      marketCenter?.id;
                    const assignmentError =
                      deactivatedUser || wrongMarketCenter;
                    return (
                      <TableRow
                        key={`${index}-${category?.id}`}
                        className="p-2 align-center cursor-pointer hover:bg-muted"
                        data-ticket-id={category.id}
                      >
                        {/* NAME */}
                        <TableCell className="font-medium">
                          {category?.name ?? "No Name"}
                        </TableCell>
                        {/* DESCRIPTION */}
                        <TableCell className="flex flex-col gap-1 cursor-pointer max-w-[150px]">
                          <ToolTip
                            content={
                              category?.description
                                ? category.description
                                : "No Description"
                            }
                            trigger={
                              <p className="line-clamp-2 truncate overflow-hidden text-ellipsis whitespace-nowrap ">
                                {category?.description
                                  ? category.description
                                  : "No Description"}
                              </p>
                            }
                          />
                        </TableCell>
                        {/* DEFAULT ASSIGNEE */}
                        <TableCell
                          className={`capitalize ${category?.defaultAssigneeId ? "hover:underline cursor-pointer" : ""}`}
                          onClick={() => {
                            if (!category?.defaultAssigneeId) return;
                            router.push(
                              `/dashboard/users/${category.defaultAssigneeId}`
                            );
                          }}
                        >
                          <p className="flex items-center justify-between gap-1">
                            <ToolTip
                              content={`${
                                category?.defaultAssignee &&
                                category?.defaultAssignee?.name
                                  ? `${category?.defaultAssignee?.name}`
                                  : category?.defaultAssigneeId &&
                                      !category?.defaultAssignee?.name
                                    ? `User #${category?.defaultAssigneeId.slice(0, 8)}`
                                    : "Unassigned"
                              }: ${
                                category?.defaultAssignee?.role
                                  ? category.defaultAssignee.role
                                      .split("_")
                                      .join(" ")
                                  : "No Role Assigned"
                              }`}
                              trigger={
                                <span>
                                  {category?.defaultAssignee &&
                                  category?.defaultAssignee?.name
                                    ? `${category?.defaultAssignee?.name}`
                                    : category?.defaultAssigneeId &&
                                        !category?.defaultAssignee?.name
                                      ? `User #${category?.defaultAssigneeId.slice(0, 8)}`
                                      : "Unassigned"}
                                </span>
                              }
                            />

                            {assignmentError && (
                              <ToolTip
                                trigger={
                                  <InfoIcon className="size-3 text-warning" />
                                }
                                content={
                                  deactivatedUser
                                    ? "Warning: This user is deactivated"
                                    : "Warning: This user is assigned to a different Market Center"
                                }
                              />
                            )}
                          </p>
                        </TableCell>
                        {/* LAST UPDATED */}
                        <TableCell className="text-center font-medium">
                          {category.updatedAt
                            ? new Date(category.updatedAt).toLocaleDateString()
                            : "Unknown"}
                        </TableCell>
                        {/* TICKET COUNT */}
                        <TableCell className="text-center font-medium">
                          {category.ticketCount}
                        </TableCell>
                        {/* ACTIONS */}
                        <TableCell className="flex gap-2 items-center justify-center">
                          <Button
                            variant={"outline"}
                            disabled={
                              isLoading ||
                              !permissions?.canManageMarketCenterCategories
                            }
                            onClick={() => {
                              setEditingTicketCategory(category);
                              setCategoryToRemove(null);
                              setCategoryFormData({
                                name: category?.name,
                                description: category?.description ?? "",
                                defaultAssigneeId:
                                  category?.defaultAssigneeId ?? "none",
                              });
                              setOpenCategoryForm(true);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            variant={"outline"}
                            disabled={
                              isLoading ||
                              !permissions?.canManageMarketCenterCategories
                            }
                            onClick={() => {
                              setEditingTicketCategory(null);
                              setCategoryToRemove(category);
                              setShowRemoveCategory(true);
                            }}
                          >
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  }
                )}
              {!isLoading &&
                (!ticketCategories || !ticketCategories.length) && (
                  <TableRow className="text-center text-muted-foreground">
                    <TableCell colSpan={5} className="py-8">
                      No categories found
                    </TableCell>
                  </TableRow>
                )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* CREATE OR EDIT TICKET CATEGORY */}
      <Dialog open={openCategoryForm} onOpenChange={setOpenCategoryForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingTicketCategory ? "Add" : "Edit"} Ticket Category
            </DialogTitle>
            <DialogDescription>
              Specific to this Market Center
              {editingTicketCategory && editingTicketCategory?.id
                ? ` (${editingTicketCategory?.id.slice(0, 8)})`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleTicketCategoryForm} className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={categoryFormData?.name}
                onChange={(e) =>
                  setCategoryFormData({
                    ...categoryFormData,
                    name: e.target.value,
                  })
                }
                className={`mt-1 ${formErrors.name && "border-destructive"}`}
                disabled={
                  !marketCenter ||
                  !teamMembers.length ||
                  !permissions?.canManageMarketCenterCategories
                }
              />
              <p className="text-sm text-destructive">
                {formErrors?.name && formErrors.name}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={categoryFormData?.description}
                onChange={(e) =>
                  setCategoryFormData({
                    ...categoryFormData,
                    description: e.target.value,
                  })
                }
                className={`mt-1 ${formErrors.description && "border-destructive"}`}
                disabled={
                  !marketCenter ||
                  !teamMembers.length ||
                  !permissions?.canManageMarketCenterCategories
                }
              />
              <p className="text-sm text-destructive">
                {formErrors?.description && formErrors.description}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Default User</Label>
              <Select
                value={categoryFormData?.defaultAssigneeId}
                onValueChange={(value) =>
                  setCategoryFormData({
                    ...categoryFormData,
                    defaultAssigneeId: value,
                  })
                }
                disabled={
                  !marketCenter ||
                  !teamMembers.length ||
                  !permissions?.canManageMarketCenterCategories
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {teamMembers &&
                    teamMembers.length > 0 &&
                    teamMembers.map((user) => {
                      return (
                        <SelectItem key={user?.id} value={user?.id}>
                          {user?.name}:{" "}
                          {user?.role
                            ? user.role.split("_").join(" ")
                            : "No Role Assigned"}
                        </SelectItem>
                      );
                    })}
                </SelectContent>
              </Select>
              <p className="text-sm text-destructive">
                {formErrors?.defaultAssignee && formErrors.description}
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 flex-wrap pt-4 border-t">
              {formErrors?.general && (
                <p className="text-sm text-destructive">{formErrors.general}</p>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => resetAndCloseForm()}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setFormErrors({});
                  setCategoryFormData({
                    name: "",
                    description: "",
                    defaultAssigneeId: "none",
                  });
                }}
                aria-label="Clear form"
                className="border"
              >
                Clear
              </Button>
              <Button
                type="submit"
                disabled={
                  isLoading || !permissions?.canManageMarketCenterCategories
                }
              >
                Submit
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* REMOVE TICKET CATEGORY */}
      <AlertDialog
        open={showRemoveCategory}
        onOpenChange={setShowRemoveCategory}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogTitle>Delete this ticket category?</AlertDialogTitle>
          <AlertDialogDescription>
            All associated tickets will lose their categorization. This cannot
            be undone.
          </AlertDialogDescription>
          <form onSubmit={handleRemoveTicketCategory} className="space-y-4">
            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => resetAndCloseForm()}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                variant={"destructive"}
              >
                Confirm
              </Button>
            </div>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
