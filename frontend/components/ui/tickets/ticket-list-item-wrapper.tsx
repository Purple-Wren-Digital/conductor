"use client";

import * as React from "react";
// import { TicketListItem } from "@/components/ui/list-item/ticket-list-item";
import { TicketListTable } from "@/components/ui/tables/ticket-list-table";
import type { Ticket } from "@/lib/types";
import { useUserRole } from "@/hooks/use-user-role";
import { useStore } from "@/context/store-provider";

type TicketWithUpdatedAt = Ticket & { updatedAt?: string | Date };

export function TicketListItemWrapper({
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
  onEdit?: (e: React.MouseEvent) => void;
  onClose?: (e: React.MouseEvent) => void;
  onClick?: () => void;
}) {
  const { currentUser } = useStore();
  const { permissions } = useUserRole();

  const canEdit = React.useMemo(() => {
    if (!permissions) return false;
    if (permissions.canReassignTicket) return true;
    if (currentUser?.role === "AGENT" && ticket.assigneeId === currentUser.id) {
      return true;
    }
    return false;
  }, [permissions, currentUser, ticket.assigneeId]);

  const canClose = React.useMemo(() => {
    if (!permissions) return false;
    if (currentUser?.role === "ADMIN" || currentUser?.role === "STAFF")
      return true;
    if (currentUser?.role === "AGENT" && ticket.assigneeId === currentUser.id)
      return true;
    return false;
  }, [permissions, currentUser, ticket.assigneeId]);

  const showCheckbox = permissions?.canBulkUpdate || false;

  return (
    <TicketListTable
      ticket={ticket}
      selected={showCheckbox ? selected : false}
      onSelect={showCheckbox ? onSelect : undefined}
      onEdit={canEdit && onEdit ? onEdit : () => {}}
      onClose={canClose && onClose ? onClose : () => {}}
      onClick={onClick}
    />
  );
}
// <TicketListItem
//   ticket={ticket}
//   selected={showCheckbox ? selected : false}
//   onSelect={showCheckbox ? onSelect : undefined}
//   onEdit={canEdit && onEdit ? onEdit : () => {}}
//   onClose={canClose && onClose ? onClose : () => {}}
//   onClick={onClick}
// />
