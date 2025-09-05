"use client";

import * as React from "react";
import { TicketListItem } from "@/components/ui/list-item/ticket-list-item";
import type { Ticket } from "@/lib/types";
import { useUserRole } from "@/lib/hooks/use-user-role";

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
  const { permissions, user } = useUserRole();
  
  const canEdit = React.useMemo(() => {
    if (!permissions) return false;
    if (permissions.canReassignTicket) return true;
    if (user?.role === "AGENT" && ticket.assigneeId === user.id) return true;
    return false;
  }, [permissions, user, ticket.assigneeId]);

  const canClose = React.useMemo(() => {
    if (!permissions) return false;
    if (user?.role === "ADMIN" || user?.role === "STAFF") return true;
    if (user?.role === "AGENT" && ticket.assigneeId === user.id) return true;
    return false;
  }, [permissions, user, ticket.assigneeId]);

  const showCheckbox = permissions?.canBulkUpdate || false;

  return (
    <TicketListItem
      ticket={ticket}
      selected={showCheckbox ? selected : false}
      onSelect={showCheckbox ? onSelect : undefined}
      onEdit={canEdit && onEdit ? onEdit : () => {}}
      onClose={canClose && onClose ? onClose : () => {}}
      onClick={onClick}
    />
  );
}