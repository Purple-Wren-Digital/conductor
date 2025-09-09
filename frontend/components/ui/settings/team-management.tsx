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
import { UserPlus, Mail, Trash2, Edit3, Shield, User, Crown } from "lucide-react";
import { 
  useTeamMembers, 
  useInviteTeamMember, 
  useRemoveTeamMember, 
  useUpdateTeamMemberRole 
} from "@/hooks/use-settings";
import { toast } from "sonner";
import { useUserRole } from "@/lib/hooks/use-user-role";

const inviteFormSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["AGENT", "STAFF", "ADMIN"], {
    required_error: "Please select a role",
  }),
});

type InviteFormData = z.infer<typeof inviteFormSchema>;

const ROLE_COLORS = {
  ADMIN: "destructive",
  STAFF: "default",
  AGENT: "secondary",
} as const;

const ROLE_ICONS = {
  ADMIN: Crown,
  STAFF: Shield,
  AGENT: User,
};

const ROLE_DESCRIPTIONS = {
  ADMIN: "Full access to all settings and data",
  STAFF: "Can manage assigned tickets and view all data",
  AGENT: "Can create and manage own tickets",
};

export default function TeamManagement() {
  const { data: teamData, isLoading } = useTeamMembers();
  const inviteTeamMember = useInviteTeamMember();
  const removeTeamMember = useRemoveTeamMember();
  const updateTeamMemberRole = useUpdateTeamMemberRole();
  const { role, permissions } = useUserRole();
  
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [editingMember, setEditingMember] = useState<{id: string, currentRole: string} | null>(null);

  const inviteForm = useForm<InviteFormData>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      email: "",
      role: "AGENT",
    },
  });

  const onInviteSubmit = async (data: InviteFormData) => {
    try {
      await inviteTeamMember.mutateAsync(data);
      toast.success(`Invitation sent to ${data.email}`);
      setShowInviteDialog(false);
      inviteForm.reset();
    } catch (error) {
      toast.error("Failed to send invitation");
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    try {
      await removeTeamMember.mutateAsync(memberId);
      toast.success(`${memberName} has been removed from the team`);
    } catch (error) {
      toast.error("Failed to remove team member");
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: string, memberName: string) => {
    try {
      await updateTeamMemberRole.mutateAsync({
        userId: memberId,
        request: { role: newRole as "AGENT" | "STAFF" | "ADMIN" },
      });
      toast.success(`${memberName}'s role has been updated to ${newRole}`);
      setEditingMember(null);
    } catch (error) {
      toast.error("Failed to update member role");
    }
  };

  const getRoleIcon = (role: string) => {
    const Icon = ROLE_ICONS[role as keyof typeof ROLE_ICONS];
    return Icon ? <Icon className="h-4 w-4" /> : <User className="h-4 w-4" />;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading team members...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Team Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Team Management
              </CardTitle>
              <CardDescription>
                Manage your team members, roles, and invitations
              </CardDescription>
            </div>
            {permissions?.canManageTeam && (
              <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Mail className="h-4 w-4 mr-2" />
                    Invite Member
                  </Button>
                </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite Team Member</DialogTitle>
                  <DialogDescription>
                    Send an invitation to join your market center team
                  </DialogDescription>
                </DialogHeader>
                <Form {...inviteForm}>
                  <form onSubmit={inviteForm.handleSubmit(onInviteSubmit)} className="space-y-4">
                    <FormField
                      control={inviteForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Enter email address" type="email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={inviteForm.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Role</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.entries(ROLE_DESCRIPTIONS)
                                .filter(([roleOption]) => {
                                  if (role === "ADMIN") return true;
                                  if (role === "STAFF") return roleOption !== "ADMIN";
                                  return false;
                                })
                                .map(([roleOption, description]) => (
                                  <SelectItem key={roleOption} value={roleOption}>
                                    <div className="flex items-center gap-2">
                                      {getRoleIcon(roleOption)}
                                      <div>
                                        <div className="font-medium">{roleOption}</div>
                                        <div className="text-xs text-muted-foreground">{description}</div>
                                      </div>
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
                        onClick={() => setShowInviteDialog(false)}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={inviteTeamMember.isPending}
                      >
                        {inviteTeamMember.isPending ? "Sending..." : "Send Invitation"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )}
          </div>
        </CardHeader>
      </Card>

      {/* Team Members Table */}
      <Card>
        <CardHeader>
          <CardTitle>Current Team Members</CardTitle>
          <CardDescription>
            {teamData?.total || 0} active team members
          </CardDescription>
        </CardHeader>
        <CardContent>
          {teamData?.members && teamData.members.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name & Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamData.members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{member.name}</div>
                        <div className="text-sm text-muted-foreground">{member.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={ROLE_COLORS[member.role]} className="flex items-center gap-1 w-fit">
                        {getRoleIcon(member.role)}
                        {member.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={member.isActive ? "default" : "secondary"}>
                        {member.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(member.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {permissions?.canChangeUserRoles && (
                          <Dialog 
                            open={editingMember?.id === member.id} 
                            onOpenChange={(open) => !open && setEditingMember(null)}
                          >
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingMember({id: member.id, currentRole: member.role})}
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Update Role</DialogTitle>
                              <DialogDescription>
                                Change {member.name}'s role in your team
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="text-sm">
                                <span className="font-medium">Current Role: </span>
                                <Badge variant={ROLE_COLORS[member.role]}>
                                  {member.role}
                                </Badge>
                              </div>
                              <div className="grid gap-2">
                                {Object.entries(ROLE_DESCRIPTIONS).map(([role, description]) => (
                                  <Button
                                    key={role}
                                    variant={role === member.role ? "default" : "outline"}
                                    className="justify-start h-auto p-4"
                                    onClick={() => handleUpdateRole(member.id, role, member.name)}
                                    disabled={updateTeamMemberRole.isPending || role === member.role}
                                  >
                                    <div className="flex items-start gap-3">
                                      {getRoleIcon(role)}
                                      <div className="text-left">
                                        <div className="font-medium">{role}</div>
                                        <div className="text-sm opacity-70">{description}</div>
                                      </div>
                                    </div>
                                  </Button>
                                ))}
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                        
                        {permissions?.canManageTeam && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to remove {member.name} from your team?
                                This action cannot be undone and will revoke their access immediately.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleRemoveMember(member.id, member.name)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Remove Member
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No team members found. Start by inviting your first team member.
            </div>
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
                  <Badge variant={ROLE_COLORS[role as keyof typeof ROLE_COLORS]}>
                    {role}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}