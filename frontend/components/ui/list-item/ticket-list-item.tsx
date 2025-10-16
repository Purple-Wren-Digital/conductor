"use client";

import * as React from "react";
import { ListItem } from "@/components/ui/list-item/base-list-item";
import type { Ticket } from "@/lib/types";
import {
  getCategoryStyle,
  getStatusBadgeStyle,
  getStatusColor,
  getUrgencyBadgeStyle,
  getUrgencyColor,
} from "@/lib/utils";
import { MessageSquare } from "lucide-react";
import { format } from "date-fns";

type TicketWithUpdatedAt = Ticket & { updatedAt?: string | Date };

export function TicketListItem({
  ticket,
  selected = false,
  onSelect,
  onEdit,
  onClose,
  onClick,
}: {
  ticket: TicketWithUpdatedAt;
  selected?: boolean;
  onSelect?: (checked: boolean) => void;
  onEdit: (e: React.MouseEvent) => void;
  onClose: (e: React.MouseEvent) => void;
  onClick?: () => void;
}) {
  const categoryName = ticket?.category?.name ?? "Category - TBD";
  return (
    <ListItem
      id={ticket.id}
      title={ticket?.title ?? "No Title"}
      subtitle={`#${ticket.id}`}
      selectable
      selected={selected}
      onSelect={(v) => onSelect?.(!!v)}
      onClick={onClick}
      primaryBadges={[
        {
          label: ticket.status.replace("_", " "),
          variant: getStatusColor(ticket.status),
          style: getStatusBadgeStyle(ticket.status),
        },
        {
          label: ticket.urgency,
          variant: getUrgencyColor(ticket.urgency),
          style: getUrgencyBadgeStyle(ticket.urgency),
        },
      ]}
      secondaryBadges={[
        {
          label: categoryName,
          variant: "category",
          style: getCategoryStyle(categoryName),
          title: `Category: ${categoryName}`,
        },
      ]}
      metadata={[
        { label: `Created by ${ticket.creator?.name || "N/A"}` },
        ...(ticket.assignee
          ? [{ label: `Assigned to ${ticket.assignee.name}` }]
          : []),
        { label: `Created ${format(new Date(ticket.createdAt), "PP")}` },
        ...(ticket.updatedAt
          ? [{ label: `Updated ${format(new Date(ticket.updatedAt), "PPp")}` }]
          : []),
        ...(ticket.commentCount
          ? [
              {
                label: String(ticket.commentCount),
                icon: <MessageSquare className="h-3 w-3" />,
              },
            ]
          : []),
      ]}
      actions={[
        {
          label: "Edit",
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
          label: "Close",
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
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          ),
          onClick: onClose,
          variant: "ghost",
          title: "Close (resolve) ticket",
        },
      ]}
    />
  );
}
