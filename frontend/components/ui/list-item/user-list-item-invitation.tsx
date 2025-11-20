"use client";

import * as React from "react";
import { ListItem } from "./base-list-item";
import { useUserRole } from "@/hooks/use-user-role";
import { UserRole } from "@/lib/types";
import { ROLE_ICONS } from "@/lib/utils";
import {
  Mail,
  Calendar as CalendarIcon,
  Send,
  User,
  Check,
} from "lucide-react";

export function InvitationUserListItem({
  disabled,
  user,
  onInvite,
  selectable,
  selected,
  onSelect,
  // onRemove,
}: {
  disabled: boolean;
  user: {
    name: string;
    email: string;
    emailVerified: "verified" | "unverified" | "unknown";
    user_metadata: {
      created: Date | null;
      // createdBy: string; // auth0 user
      invited: boolean;
      invitedOn: Date | null;
      accepted: boolean;
      acceptedOn: Date | null;
      role: UserRole | string;
    };
  };
  onInvite: () => void;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (checked: boolean) => void; // onRemove: () => void;
}) {
  const getRoleIcon = (role: string) => {
    const Icon = ROLE_ICONS[role as keyof typeof ROLE_ICONS] || User;
    return <Icon className="h-3 w-3" />;
  };
  const invitationSent = user?.user_metadata?.invitedOn
    ? ` - Invited ${new Date(user.user_metadata.invitedOn).toLocaleDateString()}`
    : "";
  const acceptedDate = user?.user_metadata?.acceptedOn
    ? ` - Accepted ${new Date(user.user_metadata.acceptedOn).toLocaleDateString()}`
    : "";
  const subtitle = `${user?.user_metadata?.accepted ? "Complete" : user?.user_metadata?.invited ? "Pending" : "No Invite Sent"}${acceptedDate}${invitationSent}`;
  return (
    <ListItem
      id={user.name}
      title={`${user.name}`}
      subtitle={subtitle}
      avatar={{
        fallback: user?.name
          ? user?.name
              .split(" ")
              .map((n: string) => n[0])
              .join("")
          : "",
      }}
      metadata={[
        {
          label: user.user_metadata.role.split("_").join(" ") || "N/a",
          icon: getRoleIcon(user.user_metadata.role),
        },
        { label: user.email, icon: <Mail className="h-3 w-3" /> },
        {
          label: `Created ${user?.user_metadata?.created ? new Date(user.user_metadata.created).toLocaleDateString() : "N/A"}`,
          icon: <CalendarIcon className="h-3 w-3" />,
        },
      ]}
      actions={[
        {
          onClick: onInvite,
          variant: "secondary",
          label: `${user.user_metadata.accepted ? "Accepted" : user.user_metadata.invited ? "Resend Invitation" : "Send Invitation"}`,
          disabled: disabled,
          icon: user.user_metadata.accepted ? (
            <Check className="h-3 w-3" />
          ) : (
            <Send className="h-3 w-3" />
          ),
        },
      ]}
      selectable={selectable}
      selected={selected}
      onSelect={onSelect}
      className="mb-3"
    />
  );
}
