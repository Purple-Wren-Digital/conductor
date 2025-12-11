"use client";

import * as React from "react";
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
  const { permissions, role } = useUserRole();

  const canEdit = React.useMemo(() => {
    if (!role || !permissions) return false;

    if (role === "AGENT" && ticket?.creator?.email === currentUser?.email) {
      return true;
    }
    if (role === "STAFF_LEADER") {
      return true;
    }
    const isMarketCenter =
      ticket?.category?.marketCenterId === currentUser?.marketCenterId ||
      ticket?.creator?.marketCenterId === currentUser?.marketCenterId;

    if (role === "STAFF" && ticket?.assigneeId === currentUser?.id) {
      return true;
    }

    if (role === "STAFF" && !ticket?.assigneeId && isMarketCenter) {
      return true;
    }

    return permissions.canEditAnyTicket;
  }, [permissions, currentUser, role, ticket]);

  const canClose = React.useMemo(() => {
    if (!permissions) {
      return false;
    }
    if (role === "ADMIN" || role === "STAFF_LEADER") {
      return true;
    }

    const isMarketCenter =
      ticket?.category?.marketCenterId === currentUser?.marketCenterId ||
      ticket?.creator?.marketCenterId === currentUser?.marketCenterId;

    if (role === "STAFF" && ticket?.assigneeId === currentUser?.id) {
      return true;
    }

    if (role === "STAFF" && !ticket?.assigneeId && isMarketCenter) {
      return true;
    }

    if (role === "AGENT" && ticket?.creator?.email === currentUser?.email) {
      return true;
    }
    return false;
  }, [permissions, currentUser, role, ticket]);

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
