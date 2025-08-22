"use client";

import * as React from "react";
import { ListItem, getRoleBadgeStyle, getRoleColor } from "./base-list-item";
import type { User } from "@/lib/types";
import { Mail, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";

function getRoleIcon(role: string) {
  switch (role) {
    case "ADMIN":
      return (
        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z"
            clipRule="evenodd"
          />
        </svg>
      );
    case "STAFF":
      return (
        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
        </svg>
      );
    default:
      return null;
  }
}

export function UserListItem({
  user,
  onEdit,
  onDelete,
}: {
  user: User & { ticketsAssigned?: number; ticketsCreated?: number };
  onEdit: () => void;
  onDelete: () => void;
}) {
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
          icon: (
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          icon: (
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          ),
          onClick: onDelete, 
          variant: "ghost",
        },
      ]}
    />
  );
}
