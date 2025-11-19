"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { TableCell, TableRow } from "@/components/ui/table";
import type { PrismaUser, Ticket } from "@/lib/types";
import {
  arrayToCommaSeparatedListWithConjunction,
  getCategoryStyle,
} from "@/lib/utils";
import { CircleMinus, TicketIcon } from "lucide-react";
import { useUserRole } from "@/hooks/use-user-role";
import { useStore } from "@/context/store-provider";

export default function MarketCenterUserTable({
  user,
  selected = false,
  onSelect,
  onEdit,
  onDelete,
  onClick,
}: {
  user: PrismaUser;
  selected?: boolean;
  onSelect?: (checked: boolean) => void;
  onEdit: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
  onClick?: () => void;
}) {
  const { permissions, role } = useUserRole();
  const { currentUser } = useStore();

  return (
    <TableRow
      className="p-2 align-center cursor-pointer hover:bg-muted"
      data-ticket-id={user.id}
    >
      <TableCell className="flex gap-2 items-center">
        <div className="flex flex-col gap-1" onClick={onClick}>
          <p className="font-medium hover:underline">
            {user?.name ?? "No Name"}
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1 whitespace-nowrap">
              <TicketIcon className="h-2.75 w-2.75" />
              {user?._count?.assignedTickets ?? 0} assigned •{" "}
              {user?._count?.createdTickets ?? 0} created{" "}
            </span>
            {/* <span className="flex items-center gap-1 whitespace-nowrap">
              <TagIcon className="h-3 w-3" />
              {`${user?.defaultForCategories && user?.defaultForCategories?.length > 0 && arrayToCommaSeparatedListWithConjunction("and", user?.defaultForCategories?.map((cat) => cat?.name) ?? [])}`}
            </span> */}
          </div>
        </div>
      </TableCell>

      <TableCell className="font-medium cursor-pointer">
        {user?.email ?? "N/a"}
      </TableCell>
      <TableCell>
        <Badge variant={user.role.toLowerCase() as any} className="capitalize">
          {user.role.split("_").join(" ").toLowerCase()}
        </Badge>
      </TableCell>
      <TableCell className="max-w-[150px]">
        {user?.defaultForCategories && user?.defaultForCategories.length > 0
          ? user?.defaultForCategories?.map((category) => (
              <Badge
                key={category.id}
                variant="category"
                title={`Default for category: ${category.name}`}
                style={getCategoryStyle(category.name ?? "Unnamed")}
                className="text-xs px-2 py-0.5 mr-1 mb-1"
              >
                {category.name}
              </Badge>
            ))
          : "-"}
      </TableCell>
      <TableCell className="flex gap-2 items-center justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={onEdit}
          disabled={!role || !permissions?.canManageTeam}
          aria-label="Go to user page to edit details"
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
          disabled={!role || !permissions?.canManageTeam}
          onClick={onDelete}
          aria-label="Remove user from market center"
        >
          <CircleMinus className="h-4 w-4" />
          Remove
        </Button>
      </TableCell>
    </TableRow>
  );
}
