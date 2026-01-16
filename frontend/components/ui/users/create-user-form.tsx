"use client";

import type React from "react";
import { useMemo, useState } from "react";
import type { UserRole } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToolTip } from "@/components/ui/tooltip/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog/base-dialog";
import { useUserRole } from "@/hooks/use-user-role";
import { User, Copy, Check } from "lucide-react";
import { ROLE_ICONS, roleOptions } from "@/lib/utils";
import { toast } from "sonner";
import { useFetchWithAuth } from "@/lib/api/fetch-with-auth";
import { useIsEnterprise, useSubscription } from "@/hooks/useSubscription";

interface InviteUserForm {
  name: string;
  email: string;
  role: UserRole | string;
}

interface InvitationResponse {
  success: boolean;
  invitationId: string;
  token: string;
  signupUrl: string;
}

type CreateUserProps = {
  showCreateUserForm: boolean;
  setShowCreateUserForm: React.Dispatch<React.SetStateAction<boolean>>;
  queryInvalidation: () => Promise<void>;
  existingEmails: string[];
};

export default function CreateUser({
  showCreateUserForm,
  setShowCreateUserForm,
  queryInvalidation,
  existingEmails,
}: CreateUserProps) {
  const [formData, setFormData] = useState<InviteUserForm>({
    name: "",
    email: "",
    role: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [invitationResult, setInvitationResult] =
    useState<InvitationResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const { isEnterprise } = useIsEnterprise();
  const { permissions } = useUserRole();
  const fetchWithAuth = useFetchWithAuth();

  const { data: subscription, isLoading: isSubscriptionLoading } =
    useSubscription();

  const getRoleIcon = (role: string) => {
    const Icon = ROLE_ICONS[role as keyof typeof ROLE_ICONS] || User;
    return <Icon className="h-4 w-4" />;
  };

  const seats = useMemo(() => {
    const activeSubscription =
      (subscription && subscription?.status === "ACTIVE") ||
      subscription?.status === "TRIALING";
    const totalSeats = activeSubscription ? subscription.totalSeats : 0;
    const filledSeats = activeSubscription ? subscription.usedSeats : 0;
    const hasAvailableSeats = filledSeats < totalSeats;

    if (!isEnterprise && !hasAvailableSeats) {
      setFormData((prev) => ({
        ...prev,
        role: prev.role === "AGENT" ? "AGENT" : "",
      }));
    }
    return { activeSubscription, totalSeats, filledSeats, hasAvailableSeats };
  }, [subscription, isEnterprise]);

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = "Name is required";

    if (!formData.email || !formData.email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Invalid email format";
    } else if (existingEmails.includes(formData?.email)) {
      errors.email = "A user with this email already exists";
    }

    if (!formData.role) {
      errors.role = "Role is required";
    } else if (
      !isEnterprise &&
      formData.role !== "AGENT" &&
      !seats?.hasAvailableSeats
    ) {
      errors.role =
        "Please upgrade your subscription to add more admin and staff users";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!permissions?.canCreateUsers) {
      toast.error("You do not have permission to invite users.");
      return;
    }
    setFormErrors({});
    if (!validateForm()) {
      toast.error("Invalid form input(s)");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetchWithAuth("/invitations", {
        method: "POST",
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          role: formData.role,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        if (error?.message && error?.message.includes("email")) {
          setFormErrors({ email: error?.message });
        }

        throw new Error(error?.message || "Failed to send invitation");
      }

      const result: InvitationResponse = await response.json();
      setInvitationResult(result);
      toast.success("Invitation sent successfully!");
    } catch (error: any) {
      console.error("Error sending invitation:", error);
      toast.error(error?.message ?? "Failed to send invitation");
    } finally {
      setIsSubmitting(false);
      await queryInvalidation();
    }
  };

  const handleCopyUrl = async () => {
    if (invitationResult?.signupUrl) {
      await navigator.clipboard.writeText(invitationResult.signupUrl);
      setCopied(true);
      toast.success("Signup URL copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setShowCreateUserForm(false);
    setFormData({ name: "", email: "", role: "" });
    setFormErrors({});
    setInvitationResult(null);
    setCopied(false);
  };

  // Show success state with signup URL
  if (invitationResult) {
    return (
      <Dialog open={showCreateUserForm} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invitation Sent!</DialogTitle>
            <DialogDescription>
              An invitation has been sent to {formData.email}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800">
                The user will receive an email with instructions to sign up. You
                can also share the signup link directly:
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Signup URL</label>
              <div className="flex gap-2">
                <Input
                  value={invitationResult.signupUrl}
                  readOnly
                  className="text-xs bg-muted"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleCopyUrl}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                This link expires in 7 days
              </p>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button onClick={handleClose}>Done</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={showCreateUserForm} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite New User</DialogTitle>
          <DialogDescription>
            Send an invitation email to add a new team member
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* NAME */}
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Name *
            </label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Enter full name"
              className={formErrors?.name ? "border-destructive" : ""}
            />
            <p className="text-sm text-destructive h-[16px]">
              {formErrors?.name && formErrors.name}
            </p>
          </div>

          {/* EMAIL */}
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
              className={formErrors?.email ? "border-destructive" : ""}
            />
            <p className="text-sm text-destructive h-[16px]">
              {formErrors?.email && formErrors.email}
            </p>
          </div>

          {/* ROLE */}
          <div className="space-y-2 mb-10">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <label
                className={`text-sm font-medium ${!permissions?.canChangeUserRoles && "text-muted-foreground"}`}
              >
                Role *
              </label>
              <ToolTip
                content={
                  !!isEnterprise || (!isEnterprise && seats?.hasAvailableSeats)
                    ? "You have available seats. All roles can be assigned."
                    : "Upgrade your subscription to assign the admin, staff leader or staff role."
                }
                trigger={
                  <p className="text-xs text-muted-foreground">
                    {!!isEnterprise
                      ? "Unlimited seats"
                      : `${seats.filledSeats} out of ${seats.totalSeats} paid seats
                    used`}
                  </p>
                }
              />
            </div>
            <Select
              value={formData.role}
              onValueChange={(value: UserRole) =>
                setFormData({ ...formData, role: value })
              }
              disabled={
                !permissions?.canChangeUserRoles || isSubscriptionLoading
              }
            >
              <SelectTrigger
                className={formErrors.role ? "border-destructive" : ""}
              >
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((role) => {
                  if (
                    !isEnterprise &&
                    !seats?.hasAvailableSeats &&
                    role !== "AGENT"
                  ) {
                    return null;
                  }
                  return (
                    <SelectItem key={role} value={role}>
                      <div className="flex items-center gap-2">
                        {getRoleIcon(role)}
                        {role.split("_").join(" ")}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <p className="text-sm text-destructive h-[16px]">
              {formErrors?.role && formErrors.role}
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 mt-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isSubscriptionLoading}
            >
              {isSubmitting ? "Sending..." : "Send Invitation"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
