"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { TableCell, TableRow } from "@/components/ui/table";
import type { Ticket } from "@/lib/types";
import { getCategoryStyle } from "@/lib/utils";
import { MessageSquare, Paperclip } from "lucide-react";
import { useUserRole } from "@/hooks/use-user-role";

type TicketWithUpdatedAt = Ticket & { updatedAt?: string | Date };

export function TicketListTable({
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
  const { permissions } = useUserRole();

  return (
    <TableRow
      className="py-2 align-center cursor-pointer hover:bg-accent"
      data-ticket-id={ticket.id}
    >
      <TableCell className="flex gap-2 items-center">
        {permissions?.canBulkUpdate && (
          <Checkbox checked={selected} onCheckedChange={onSelect} />
        )}
        <div className="flex flex-col gap-1" onClick={onClick}>
          <p className="font-medium hover:underline">
            {ticket?.title ?? "No Title"}
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
            <span className="text-xs text-muted-foreground ">{`Created on  ${new Date(ticket.createdAt).toLocaleDateString()}`}</span>
            <span className="flex items-center gap-1 whitespace-nowrap">
              <Paperclip className="h-2.75 w-2.75" />
              {ticket?.attachmentCount ? ticket.attachmentCount : "0"}
            </span>
            <span className="flex items-center gap-1 whitespace-nowrap">
              <MessageSquare className="h-3 w-3" />
              {ticket?.commentCount ? ticket.commentCount : "0"}
            </span>
          </div>
        </div>
      </TableCell>

      <TableCell className="font-medium">
        {ticket?.assignee?.name ? ticket.assignee.name : "Unassigned"}
      </TableCell>
      <TableCell>
        <Badge
          variant={ticket.status.toLowerCase() as any}
          className="capitalize"
        >
          {ticket.status.split("_").join(" ").toLowerCase()}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge variant={ticket.urgency.toLowerCase() as any}>
          {ticket.urgency}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge
          variant="category"
          style={getCategoryStyle(ticket?.category?.name ?? "Misc")}
        >
          {ticket?.category?.name ?? "Misc"}
        </Badge>
      </TableCell>
      <TableCell className="flex gap-2 items-center justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={onEdit}
          disabled={ticket?.status === "RESOLVED"}
          aria-label="Open edit ticket modal"
        >
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
          Edit
        </Button>

        <Button
          variant="outline"
          size="sm"
          disabled={ticket?.status === "RESOLVED"}
          onClick={onClose}
          aria-label="Open close ticket modal"
        >
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
          Close
        </Button>
      </TableCell>
    </TableRow>
  );
}
