"use client";

import * as React from "react";
import { ListItem, getRoleBadgeStyle } from "./base-list-item";
import type { PrismaUser } from "@/lib/types";
import { Mail, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { getRoleColor } from "@/lib/utils";
import { useUserRole } from "@/lib/hooks/use-user-role";

export function UserListItem({
  user,
  onEdit,
  onDelete,
}: {
  user: PrismaUser & { ticketsAssigned?: number; ticketsCreated?: number };
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { permissions } = useUserRole();
  return (
    <ListItem
      id={user.id}
      title={user.name}
      avatar={{
        fallback: user.name
          .split(" ")
          .map((n: string) => n[0])
          .join(""),
      }}
      primaryBadges={[
        {
          label: user.role,
          variant: getRoleColor(user.role),
          style: getRoleBadgeStyle(user.role),
          title: `Role: ${user.role}`,
        },
      ]}
      metadata={[
        { label: user.email, icon: <Mail className="h-3 w-3" /> },
        { label: `${user.ticketsAssigned ?? 0} assigned` },
        { label: `${user.ticketsCreated ?? 0} created` },
        {
          label: `Joined ${format(new Date(user.createdAt), "MMM d, yyyy")}`,
          icon: <CalendarIcon className="h-3 w-3" />,
        },
      ]}
      actions={[
        {
          label: "Edit",
          disabled: !permissions?.canManageAllUsers,
          icon: (
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          ),
          onClick: onEdit,
        },
        {
          label: "Deactivate",
          disabled: !permissions?.canDeactivateUsers,
          icon: (
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          ),
          onClick: onDelete,
          variant: "ghost",
        },
      ]}
    />
  );
}
