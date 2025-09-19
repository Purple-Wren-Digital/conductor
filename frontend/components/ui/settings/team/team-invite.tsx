"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
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
  getRoleDescription,
  ROLE_DESCRIPTIONS,
  ROLE_ICONS,
  roleOptions,
} from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { useInviteTeamMember, useListTeamMembers } from "@/hooks/use-settings";
import { UserRole, useUserRole } from "@/lib/hooks/use-user-role";
import { Mail, User } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

type TeamInviteProps = {};

const inviteFormSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["AGENT", "STAFF", "ADMIN"], {
    required_error: "Please select a role",
  }),
});

type InviteFormData = z.infer<typeof inviteFormSchema>;

export default function TeamInvite() {
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "AGENT",
  });
  const { permissions } = useUserRole();
  const { isLoading } = useListTeamMembers();

  const inviteTeamMember = useInviteTeamMember();

  const [showInviteDialog, setShowInviteDialog] = useState(false);

  const getRoleIcon = (role: string) => {
    const Icon = ROLE_ICONS[role as keyof typeof ROLE_ICONS] || User;
    return <Icon className="h-4 w-4" />;
  };

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
  return (
    <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
      <DialogTrigger
        asChild
        disabled={isLoading} // TODO: Email notification and logic
      >
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
        <form
          onSubmit={inviteForm.handleSubmit(onInviteSubmit)}
          className="space-y-4"
        >
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Full Name *
            </label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
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
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
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
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowInviteDialog(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              // disabled={inviteTeamMember.isPending}
              disabled={true} 
            >
              {inviteTeamMember.isPending ? "Sending..." : "Send Invitation"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
