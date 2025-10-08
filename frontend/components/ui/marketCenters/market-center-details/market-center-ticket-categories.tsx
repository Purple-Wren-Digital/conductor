"use client";

import { Dispatch, SetStateAction, useCallback, useState } from "react";
// import { useStore } from "@/app/store-provider";
import { getAccessToken } from "@auth0/nextjs-auth0";
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
import { Plus } from "lucide-react";

// import { useFetchMarketCenterTicketCategories } from "@/hooks/use-market-center";
import { API_BASE } from "@/lib/api/utils";
import { useUserRole } from "@/lib/hooks/use-user-role";
import type { MarketCenter, PrismaUser, TicketCategory } from "@/lib/types";
// import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  useMutation,
  // , useQueryClient
} from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "../../alert-dialog";

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
  // const router = useRouter();
  const [showRemoveCategory, setShowRemoveCategory] = useState(false);
  const [categoryToRemove, setCategoryToRemove] =
    useState<TicketCategory | null>(null);

  const [openCategoryForm, setOpenCategoryForm] = useState(false);
  const [editingTicketCategory, setEditingTicketCategory] =
    useState<TicketCategory | null>(null);

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [categoryFormData, setCategoryFormData] = useState({
    // id: "",
    name: "",
    description: "",
    defaultAssigneeId: "none",
  });

  // const { currentUser } = useStore();
  const { role, permissions } = useUserRole();

  const teamMembers: PrismaUser[] =
    marketCenter && marketCenter?.users
      ? marketCenter?.users
      : ([] as PrismaUser[]);
  const ticketCategories: TicketCategory[] =
    marketCenter?.ticketCategories ?? ([] as TicketCategory[]);

  // const { data: ticketCategoriesData, isLoading: ticketCategoriesLoading } =
  //   useFetchMarketCenterTicketCategories({ marketCenterId: marketCenterId });
  // const ticketCategories: TicketCategory[] =
  //   ticketCategoriesData?.ticketCategories ?? [];

  const getAuth0AccessToken = useCallback(async () => {
    if (process.env.NODE_ENV === "development") return "local";
    return await getAccessToken();
  }, []);

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
    if (!categoryFormData?.name || !categoryFormData?.name.trim) {
      errors.name = "Name is required";
    }

    const defaultAssigneeFormValue =
      editingTicketCategory && categoryFormData?.defaultAssigneeId === "none"
        ? ""
        : categoryFormData?.defaultAssigneeId;
    if (
      editingTicketCategory &&
      categoryFormData?.name === editingTicketCategory?.name &&
      categoryFormData?.description === editingTicketCategory?.description &&
      defaultAssigneeFormValue === categoryFormData?.defaultAssigneeId
    ) {
      errors.general = "No changes were made";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const createOrUpdateTicketCategoryMutation = useMutation({
    mutationFn: async () => {
      if (!marketCenter || !marketCenter?.id)
        throw new Error("Missing Market Center ID");

      const accessToken = await getAuth0AccessToken();
      const response = await fetch(
        `${API_BASE}/marketCenters/ticketCategories${editingTicketCategory && editingTicketCategory?.id ? `/${editingTicketCategory?.id}` : ""}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            marketCenterId: marketCenter.id,
            name: categoryFormData?.name ?? "",
            description: categoryFormData?.defaultAssigneeId ?? null,
            defaultAssignee: categoryFormData?.defaultAssigneeId ?? null,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to create ticket category");
      const data = await response.json();
      console.log(
        `${editingTicketCategory && editingTicketCategory?.id ? "UPDATE" : "CREATE"}`,
        "Ticket Category Mutation",
        data
      );
    },
    onSuccess: async (_) => {
      toast.success(
        `${categoryFormData?.name} ${editingTicketCategory && editingTicketCategory?.id ? "updated" : "created"}`
      );
      invalidateMarketCenter;
      resetAndCloseForm();
    },
    onError: (error) => {
      console.error(
        `Failed to ${editingTicketCategory && editingTicketCategory?.id ? "update" : "create"} category`,
        error
      );
      toast.error(
        `Failed to ${editingTicketCategory && editingTicketCategory?.id ? "update" : "create"} category`
      );
    },
  });

  const handleTicketCategoryForm = async (e: React.FormEvent) => {
    e.preventDefault();

    // if (!permissions?.canCreateUsers) {
    //   toast.error("You do not have permission to create users.");
    //   return;
    // }
    setFormErrors({});
    if (!validateForm()) {
      toast.error("Invalid input(s)");
      return;
    }
    setIsLoading(true);
    createOrUpdateTicketCategoryMutation.mutate();
    setIsLoading(false);
  };

  const deleteTicketCategoryMutation = useMutation({
    mutationFn: async () => {
      if (!categoryToRemove || !categoryToRemove?.id) {
        throw new Error("Missing ID");
      }

      const accessToken = await getAuth0AccessToken();
      const response = await fetch(
        `${API_BASE}/marketCenters/ticketCategories/${categoryToRemove.id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to create ticket category");
      const data = await response.json();
      console.log(
        `${editingTicketCategory && editingTicketCategory?.id ? "UPDATE" : "CREATE"}`,
        "Ticket Category Mutation",
        data
      );
    },
    onSuccess: async (_) => {
      toast.success(`Category was deleted`);
      invalidateMarketCenter();
      resetAndCloseForm();
    },
    onError: (error) => {
      console.error(`Failed to delete category`, error);
      toast.error(`Failed to delete category`);
    },
  });
  const handleRemoveTicketCategory = async (e: React.FormEvent) => {
    e.preventDefault();

    if (role === "AGENT") {
      toast.error("You do not have permission to delete categories");
      return;
    }
    setFormErrors({});
    setIsLoading(true);
    deleteTicketCategoryMutation.mutate();
    setIsLoading(false);
  };

  console.log("editingTicketCategory", editingTicketCategory);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row space-x-2 items-center justify-between mb-3">
          <CardTitle>Ticket Categories</CardTitle>
          <Button
            variant={"secondary"}
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
          {isLoading && (
            <p className="text-muted-foreground">Loading categories... </p>
          )}
          {ticketCategories &&
            ticketCategories.length > 0 &&
            ticketCategories.map((category: TicketCategory) => {
              console.log(
                "MARKET CENTER ID:",
                category?.marketCenterId,
                "CATEGORY:",
                category?.name,
                category?.id
              );
              return (
                <div
                  key={category?.id}
                  className="border-b rounded p-2 pb-6 flex flex-row item-center justify-between"
                >
                  <div className="space-y-2">
                    <p className="font-semibold text-md">{category?.name}</p>
                    <p className="font-medium text-muted-foreground text-sm">
                      {category?.description ?? "No Description"}
                    </p>
                    <div className="flex gap-4">
                      <p className="font-medium text-muted-foreground text-sm">
                        {category?.defaultAssignee?.name
                          ? `Default: ${category?.defaultAssignee?.name}`
                          : "No default user"}
                      </p>
                      <p className="font-medium text-muted-foreground text-sm">
                        Tickets: 0
                      </p>
                      <p className="font-medium text-muted-foreground text-sm">
                        Created on{" "}
                        {category?.createdAt
                          ? new Date(category?.createdAt).toLocaleDateString()
                          : "-"}
                      </p>
                    </div>
                  </div>
                  <div>
                    {/* <Button
                      variant={"ghost"}
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
                    </Button> */}
                    <Button
                      variant={"ghost"}
                      onClick={() => {
                        setEditingTicketCategory(null);
                        setCategoryToRemove(category);
                        setShowRemoveCategory(true);
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              );
            })}

          {(!ticketCategories || !ticketCategories.length) && (
            <p className="text-muted-foreground">No categories yet!</p>
          )}
        </CardContent>
      </Card>

      {/* CREATE OR EDIT TICKET CATEGORY */}
      <Dialog open={openCategoryForm} onOpenChange={setOpenCategoryForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div>
              <DialogTitle>
                {editingTicketCategory ? "Add" : "Edit"} Ticket Category
              </DialogTitle>
              <DialogDescription>
                Specific to this Market Center
                {editingTicketCategory && editingTicketCategory?.id
                  ? ` (${editingTicketCategory?.id.slice(0, 8)})`
                  : ""}
              </DialogDescription>
            </div>
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
            >
              Clear Form
            </Button>
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
                disabled={!marketCenter || !teamMembers.length}
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
                          {user?.name}
                        </SelectItem>
                      );
                    })}
                </SelectContent>
              </Select>
              <p className="text-sm text-destructive">
                {formErrors?.defaultAssignee && formErrors.description}
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <p className="text-sm text-destructive">
                {formErrors?.general && formErrors.general}
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => resetAndCloseForm()}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
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
