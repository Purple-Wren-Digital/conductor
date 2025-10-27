"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog/base-dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tag, Plus, Edit3, Trash2, User, Settings } from "lucide-react";
import { 
  useTicketCategories, 
  useCreateTicketCategory, 
  useUpdateTicketCategory, 
  useDeleteTicketCategory,
  useListTeamMembers 
} from "@/hooks/use-settings";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";

const categoryFormSchema = z.object({
  name: z.string().min(1, "Category name is required"),
  defaultAssigneeId: z.string().optional(),
});

type CategoryFormData = z.infer<typeof categoryFormSchema>;

export default function TicketCategories() {
  const { user: clerkUser } = useUser();
  const { data: categoriesData, isLoading: categoriesLoading } = useTicketCategories(clerkUser?.id);
  const { data: teamData } = useListTeamMembers(clerkUser?.id);
  const createCategory = useCreateTicketCategory(clerkUser?.id);
  const updateCategory = useUpdateTicketCategory(clerkUser?.id);
  const deleteCategory = useDeleteTicketCategory(clerkUser?.id);
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);

  const createForm = useForm<CategoryFormData>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: "",
      defaultAssigneeId: "",
    },
  });

  const editForm = useForm<CategoryFormData>({
    resolver: zodResolver(categoryFormSchema),
  });

  const onCreateSubmit = async (data: CategoryFormData) => {
    try {
      await createCategory.mutateAsync({
        name: data.name,
        defaultAssigneeId: data.defaultAssigneeId || undefined,
      });
      toast.success("Category created successfully");
      setShowCreateDialog(false);
      createForm.reset();
    } catch (error) {
      toast.error("Failed to create category");
    }
  };

  const onEditSubmit = async (data: CategoryFormData) => {
    if (!editingCategory) return;
    
    try {
      await updateCategory.mutateAsync({
        id: editingCategory.id,
        data: {
          name: data.name,
          defaultAssigneeId: data.defaultAssigneeId || undefined,
        },
      });
      toast.success("Category updated successfully");
      setEditingCategory(null);
    } catch (error) {
      toast.error("Failed to update category");
    }
  };

  const handleToggleActive = async (categoryId: string, isActive: boolean, categoryName: string) => {
    try {
      await updateCategory.mutateAsync({
        id: categoryId,
        data: { isActive },
      });
      toast.success(`Category "${categoryName}" has been ${isActive ? "activated" : "deactivated"}`);
    } catch (error) {
      toast.error("Failed to update category status");
    }
  };

  const handleDelete = async (categoryId: string, categoryName: string) => {
    try {
      await deleteCategory.mutateAsync(categoryId);
      toast.success(`Category "${categoryName}" has been deleted`);
    } catch (error) {
      toast.error("Failed to delete category");
    }
  };

  const openEditDialog = (category: any) => {
    setEditingCategory(category);
    editForm.reset({
      name: category.name,
      defaultAssigneeId: category.defaultAssigneeId || "",
    });
  };

  const getAssigneeName = (assigneeId: string | undefined) => {
    if (!assigneeId) return "Unassigned";
    const assignee = teamData?.members.find(m => m.id === assigneeId);
    return assignee ? assignee.name : "Unknown User";
  };

  if (categoriesLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ticket Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading categories...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Categories Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Ticket Categories
              </CardTitle>
              <CardDescription>
                Manage ticket categories and their auto-routing configuration
              </CardDescription>
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Category
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Category</DialogTitle>
                  <DialogDescription>
                    Add a new ticket category with optional auto-assignment
                  </DialogDescription>
                </DialogHeader>
                <Form {...createForm}>
                  <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                    <FormField
                      control={createForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., Technical Support, Billing" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createForm.control}
                      name="defaultAssigneeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Default Assignee (Optional)</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select default assignee" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="">No default assignee</SelectItem>
                              {teamData?.members.filter(m => m.isActive).map((member) => (
                                <SelectItem key={member.id} value={member.id}>
                                  <div className="flex items-center gap-2">
                                    <User className="h-4 w-4" />
                                    <span>{member.name}</span>
                                    <Badge variant="outline" className="text-xs">
                                      {member.role}
                                    </Badge>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end gap-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowCreateDialog(false)}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={createCategory.isPending}
                      >
                        {createCategory.isPending ? "Creating..." : "Create Category"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      {/* Categories Table */}
      <Card>
        <CardHeader>
          <CardTitle>Current Categories</CardTitle>
          <CardDescription>
            {categoriesData?.categories?.length || 0} ticket categories configured
          </CardDescription>
        </CardHeader>
        <CardContent>
          {categoriesData?.categories && categoriesData.categories.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Default Assignee</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categoriesData.categories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{category.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        {getAssigneeName(category.defaultAssigneeId)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={category.isActive}
                          onCheckedChange={(checked) => 
                            handleToggleActive(category.id, checked, category.name)
                          }
                          disabled={updateCategory.isPending}
                        />
                        <Badge variant={category.isActive ? "default" : "secondary"}>
                          {category.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(category.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Dialog 
                          open={editingCategory?.id === category.id} 
                          onOpenChange={(open) => !open && setEditingCategory(null)}
                        >
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditDialog(category)}
                            >
                              <Edit3 className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit Category</DialogTitle>
                              <DialogDescription>
                                Update category details and assignment settings
                              </DialogDescription>
                            </DialogHeader>
                            <Form {...editForm}>
                              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                                <FormField
                                  control={editForm.control}
                                  name="name"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Category Name</FormLabel>
                                      <FormControl>
                                        <Input {...field} placeholder="Category name" />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={editForm.control}
                                  name="defaultAssigneeId"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Default Assignee</FormLabel>
                                      <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                          <SelectTrigger>
                                            <SelectValue placeholder="Select default assignee" />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          <SelectItem value="">No default assignee</SelectItem>
                                          {teamData?.members.filter(m => m.isActive).map((member) => (
                                            <SelectItem key={member.id} value={member.id}>
                                              <div className="flex items-center gap-2">
                                                <User className="h-4 w-4" />
                                                <span>{member.name}</span>
                                                <Badge variant="outline" className="text-xs">
                                                  {member.role}
                                                </Badge>
                                              </div>
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <div className="flex justify-end gap-2 pt-4">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setEditingCategory(null)}
                                  >
                                    Cancel
                                  </Button>
                                  <Button 
                                    type="submit" 
                                    disabled={updateCategory.isPending}
                                  >
                                    {updateCategory.isPending ? "Updating..." : "Update Category"}
                                  </Button>
                                </div>
                              </form>
                            </Form>
                          </DialogContent>
                        </Dialog>
                        
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
                              <AlertDialogTitle>Delete Category</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete the &quot;{category.name}&quot; category?
                                This action cannot be undone and may affect existing tickets.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(category.id, category.name)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete Category
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No ticket categories configured. Create your first category to get started.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Auto-routing Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Auto-routing Configuration
          </CardTitle>
          <CardDescription>
            How ticket categories work with automatic assignment
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 border rounded-lg bg-muted/50">
            <h4 className="font-medium mb-2">How Auto-routing Works</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• When a ticket is created with a specific category, it will be automatically assigned to the category&apos;s default assignee (if configured)</li>
              <li>• If no default assignee is set for a category, tickets will remain unassigned and can be manually assigned later</li>
              <li>• Only active categories will appear in the ticket creation form</li>
              <li>• Auto-routing requires the &quot;Auto Assignment&quot; setting to be enabled in General Settings</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}