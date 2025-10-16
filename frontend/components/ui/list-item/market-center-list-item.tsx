"use client";

import * as React from "react";
import { ListItem } from "./base-list-item";
import type { MarketCenter } from "@/lib/types";
import { Calendar, CircleMinus, Users } from "lucide-react";
import { format } from "date-fns";

export function MarketCenterListItem({
  marketCenter,
  selected = false,
  selectable,
  onSelect,
  onEdit,
  onClose,
  onClick,
}: {
  marketCenter: MarketCenter;
  selectable: boolean;
  selected?: boolean;
  onSelect?: (checked: boolean) => void;
  onEdit: (e: React.MouseEvent) => void;
  onClose: (e: React.MouseEvent) => void;
  onClick?: () => void;
}) {
  const firstUser =
    marketCenter?.users && marketCenter?.users.length > 0
      ? marketCenter?.users[0].name
      : "";
  return (
    <ListItem
      id={marketCenter.id}
      title={marketCenter.name}
      subtitle={`#${marketCenter.id.slice(0, 8)}${firstUser ? ` | Manager - ${firstUser}` : ""}`}
      selectable={selectable}
      selected={selected}
      onSelect={(v) => onSelect?.(!!v)}
      onClick={onClick}
      metadata={[
        {
          label:
            marketCenter?.users && marketCenter?.users.length
              ? String(marketCenter?.users.length)
              : "0",
          icon: <Users className="h-3 w-3" />,
        },
        {
          label: `Created ${format(new Date(marketCenter.createdAt), "PP")}`,
          icon: <Calendar className="h-3 w-3" />,
        },
        ...(marketCenter?.updatedAt
          ? [
              {
                label: `Updated ${format(new Date(marketCenter.updatedAt), "PPp")}`,
              },
            ]
          : []),
      ]}
      actions={[
        {
          label: "Edit", // Edit
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
          label: "Deactivate", // Remove
          icon: <CircleMinus />,
          onClick: onClose,
          variant: "ghost",
          title: "Deactivate Market Center",
        },
      ]}
    />
  );
}
