"use client";

import type React from "react";
import { useState, useEffect, useCallback } from "react";
import type { PrismaUser, UserRole } from "@/lib/types";
import { getAccessToken } from "@auth0/nextjs-auth0";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog/base-dialog";
import { useUserRole } from "@/lib/hooks/use-user-role";
import { Search, Users, Mail, User, UserPlus } from "lucide-react";
import { UserListItem } from "@/components/ui/list-item/user-list-item";
import { ROLE_ICONS } from "@/lib/utils";
import { toast } from "sonner";
import UserCreate from "./user-creation";

interface UserWithStats extends PrismaUser {
  ticketsAssigned?: number;
  ticketsCreated?: number;
  lastActive?: Date;
}

interface UserEditFormData {
  name: string;
  email: string;
  role: UserRole;
}

const roleOptions: UserRole[] = ["AGENT", "STAFF", "ADMIN"];

export default function UserManagement() {
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
  const [selectedRole, setSelectedRole] = useState<UserRole | "all">("all");

  const [showCreateUserForm, setShowCreateUserForm] = useState(false);
  const [showEditUserForm, setShowEditUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithStats | null>(null);
  const [editUserFormData, setEditUserFormData] = useState<UserEditFormData>({
    name: "",
    email: "",
    role: "AGENT",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserWithStats | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { permissions } = useUserRole();

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearchQuery(searchQuery), 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const getAuth0AccessToken = useCallback(async () => {
    if (process.env.NODE_ENV === "development") return "local";
    return await getAccessToken();
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (debouncedSearchQuery) params.append("query", debouncedSearchQuery);
    if (selectedRole !== "all") params.append("role", selectedRole);

    try {
      const accessToken = await getAuth0AccessToken();
      const response = await fetch(`/api/users/search?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch users");
      const data = await response.json();
      const usersWithStats = data.users.map((user: PrismaUser) => ({
        ...user,
        createdAt: new Date(user.createdAt),
        ticketsAssigned: 0,
        ticketsCreated: 0,
        lastActive: new Date(),
      }));
      setUsers(usersWithStats);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearchQuery, selectedRole, getAuth0AccessToken]);

  useEffect(() => {
    if (!permissions?.canManageAllUsers) return;
    fetchUsers();
  }, [fetchUsers]);

  const handleCreateUser = () => {
    setEditingUser(null);
    setShowCreateUserForm(true);
  };

  const handleEditUser = (user: UserWithStats) => {
    setEditingUser(user);
    setEditUserFormData({
      name: user.name,
      email: user.email,
      role: user.role,
    });
    setFormErrors({});
    setShowEditUserForm(true);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!editUserFormData.name.trim()) errors.name = "Name is required";
    if (!editUserFormData.email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editUserFormData.email)) {
      errors.email = "Invalid email format";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitEditUserForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !permissions?.canManageAllUsers) return;
    setIsSubmitting(true);
    if (!editingUser || !editingUser?.id)
      throw new Error("Missing editing user ID");

    const url = `/api/users/${editingUser.id}/update`;
    const method = "PUT";

    try {
      const accessToken = await getAuth0AccessToken();
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(editUserFormData),
      });

      console.log("handleSubmitForm()", response);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to update user`);
      }
      toast.success(`${editUserFormData.name} has been updated`);
      setShowEditUserForm(false);
      await fetchUsers();
    } catch (error) {
      console.error(error);
    } finally {
      setFormErrors({});
      setEditUserFormData({
        name: "",
        email: "",
        role: "AGENT",
      });
      setEditingUser(null);
      setIsSubmitting(false);
    }
  };

  // Open confirm modal instead of window.confirm
  const openDeleteModal = (user: UserWithStats) => {
    setUserToDelete(user);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!permissions?.canDeactivateUsers || !userToDelete) return;
    try {
      setDeleting(true);
      const accessToken = await getAuth0AccessToken();
      const response = await fetch(`/api/users/${userToDelete.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ id: userToDelete.id }),
      });
      if (!response.ok) {
        throw new Error("Failed to deactivate user");
      }
      const data = await response.json();
      if (!data) {
        throw new Error("Failed to deactivate user");
      }
      toast.success(`${userToDelete?.name} was deactivated`);
      setConfirmOpen(false);
      setUserToDelete(null);
      await fetchUsers();
    } catch (error) {
      console.error("Server error", error);
      toast.error("Error: Unable to deactivate user");
    } finally {
      setDeleting(false);
    }
  };

  const getRoleIcon = (role: string) => {
    const Icon = ROLE_ICONS[role as keyof typeof ROLE_ICONS] || User;
    return <Icon className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Management ({users.length})
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Manage active users, roles, and permissions
              </p>
            </div>
            <Button
              onClick={handleCreateUser}
              className="gap-2"
              disabled={!permissions?.canCreateUsers}
            >
              <UserPlus className="h-4 w-4" />
              Create New User
            </Button>
          </div>

          <div className="flex items-center gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={selectedRole}
              onValueChange={(value: UserRole | "all") =>
                setSelectedRole(value)
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
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
        </CardHeader>

        <CardContent>
          {loading && users.length === 0 ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-16 bg-muted rounded" />
                </div>
              ))}
            </div>
          ) : (
            <div
              className={`space-y-4 transition-opacity duration-300 ${
                loading ? "opacity-50 pointer-events-none" : "opacity-100"
              }`}
            >
              {users.map((user) => (
                <UserListItem
                  key={user.id}
                  user={user}
                  onEdit={() => handleEditUser(user)}
                  onDelete={() => openDeleteModal(user)} // open modal
                />
              ))}

              {users.length === 0 && !loading && (
                <div className="text-center py-8 text-muted-foreground">
                  No users found matching your criteria.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* CREATE USER */}
      <UserCreate
        showCreateUserForm={showCreateUserForm}
        setShowCreateUserForm={setShowCreateUserForm}
      />

      {/* EDIT USER */}
      <Dialog open={showEditUserForm} onOpenChange={setShowEditUserForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmitEditUserForm} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Full Name *
              </label>
              <Input
                id="name"
                value={editUserFormData.name}
                onChange={(e) =>
                  setEditUserFormData({
                    ...editUserFormData,
                    name: e.target.value,
                  })
                }
                placeholder="Enter full name"
                className={formErrors.name ? "border-destructive" : ""}
              />
              {formErrors.name && (
                <p className="text-sm text-destructive">{formErrors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email Address *
              </label>
              <Input
                id="email"
                type="email"
                value={editUserFormData.email}
                onChange={(e) =>
                  setEditUserFormData({
                    ...editUserFormData,
                    email: e.target.value,
                  })
                }
                placeholder="Enter email address"
                className={formErrors.email ? "border-destructive" : ""}
              />
              {formErrors.email && (
                <p className="text-sm text-destructive">{formErrors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Role *</label>
              <Select
                value={editUserFormData.role}
                onValueChange={(value: UserRole) =>
                  setEditUserFormData({ ...editUserFormData, role: value })
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
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEditUserForm(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              {editingUser && (
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Update User"}
                </Button>
              )}
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE USER */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Deactivate user?</DialogTitle>
            <DialogDescription>
              {userToDelete ? (
                <>
                  This will deactivate{" "}
                  <span className="font-medium">{userToDelete.name}</span> (
                  {userToDelete.email}). They won’t be able to sign in, and
                  they’ll be hidden from lists. You can restore them later.
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setConfirmOpen(false);
                setUserToDelete(null);
              }}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleting || !permissions?.canDeactivateUsers}
            >
              {deleting ? "Deactivating..." : "Deactivate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
