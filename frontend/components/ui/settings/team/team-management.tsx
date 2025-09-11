"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
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
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog/base-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { useInviteTeamMember, useTeamMembers } from "@/hooks/use-settings";
import { useUserRole } from "@/lib/hooks/use-user-role";
import {
  getRoleDescription,
  ROLE_COLORS,
  ROLE_DESCRIPTIONS,
  ROLE_ICONS,
} from "@/lib/utils";
import { UserPlus, Mail, User } from "lucide-react";
import { toast } from "sonner";
import TeamTable from "./team-table";
import { z } from "zod";

const inviteFormSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["AGENT", "STAFF", "ADMIN"], {
    required_error: "Please select a role",
  }),
});

type InviteFormData = z.infer<typeof inviteFormSchema>;

export default function TeamManagement() {
  const { isLoading } = useTeamMembers();
  const { role, permissions } = useUserRole();
  const inviteTeamMember = useInviteTeamMember();
  const [showInviteDialog, setShowInviteDialog] = useState(false);

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

  const getRoleIcon = (role: string) => {
    const Icon = ROLE_ICONS[role as keyof typeof ROLE_ICONS] || User;
    return <Icon className="h-4 w-4" />;
  };

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
              <Dialog
                open={showInviteDialog}
                onOpenChange={setShowInviteDialog}
              >
                <DialogTrigger asChild disabled={isLoading}>
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
                    <form
                      onSubmit={inviteForm.handleSubmit(onInviteSubmit)}
                      className="space-y-4"
                    >
                      <FormField
                        control={inviteForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Address</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Enter email address"
                                type="email"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={inviteForm.control}
                        name="role"
                        render={({ field }) => (
                          <FormItem className="h-32">
                            <FormLabel>Role</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {Object.entries(ROLE_DESCRIPTIONS)
                                  .filter(([roleOption]) => {
                                    if (role === "ADMIN") return true;
                                    if (role === "STAFF")
                                      return roleOption !== "ADMIN";
                                    return false;
                                  })
                                  .map(([roleOption, description]) => (
                                    <SelectItem
                                      key={roleOption}
                                      value={roleOption}
                                    >
                                      <div className="flex items-center gap-2">
                                        {getRoleIcon(roleOption)}
                                        <div>
                                          <div className="font-medium">
                                            {roleOption}
                                          </div>
                                          <div className="text-xs text-muted-foreground">
                                            {getRoleDescription(role)}
                                          </div>
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
                          {inviteTeamMember.isPending
                            ? "Sending..."
                            : "Send Invitation"}
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
      {/* ManagementTable  */}
      <TeamTable />

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
    </div>
  );
}
