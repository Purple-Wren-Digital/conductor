"use client";

import * as React from "react";
import { ListItem } from "./base-list-item";
import type { MarketCenter, PrismaUser } from "@/lib/types";
import {
  Mail,
  CalendarIcon,
  CircleMinus,
  ArrowRightCircle,
  TagIcon,
  Ticket,
} from "lucide-react";
import { format } from "date-fns";
import {
  getCategoryStyle,
  arrayToCommaSeparatedListWithConjunction,
} from "@/lib/utils";
import { useFetchMarketCenter } from "@/hooks/use-market-center";
import { useUserRole } from "@/hooks/use-user-role";

export function UserListItem({
  user,
  onEdit,
  deleteLabel,
  onDelete,
  onClick,
}: {
  user: PrismaUser & { ticketsAssigned?: number; ticketsCreated?: number };
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
  deleteLabel: "Remove" | "Deactivate";
}) {
  const { role, permissions } = useUserRole();

  const { data: marketCenterData } = useFetchMarketCenter(
    role,
    user?.marketCenterId ?? ""
  );

  const marketCenter: MarketCenter = marketCenterData ?? {};

  return (
    <ListItem
      id={user.id}
      title={`${user.name}`}
      subtitle={`${
        marketCenter?.name
          ? `${marketCenter.name} Market Center${marketCenter?.id && ` (#${marketCenter?.id.slice(0, 8)})`}`
          : "No Assigned Market Center"
      }`}
      avatar={{
        fallback: user?.name
          ? user?.name
              .split(" ")
              .map((n: string) => n[0])
              .join("")
          : "",
      }}
      onClick={onClick}
      primaryBadges={[
        {
          label: `${user?.role ? user.role.split("_").join(" ") : "N/A"}`,
          variant: (user?.role ? user.role.toLowerCase() : "user") as any,
          title: `Role: ${user?.role ? user.role.split("_").join(" ") : "N/A"}`,
        },
        ...(user?.defaultForCategories && user?.defaultForCategories.length > 0
          ? user?.defaultForCategories?.map((category) => ({
              label: category.name,
              variant: "category",
              title: `Default for category: ${category.name}`,
              style: getCategoryStyle(category.name ?? "Unnamed"),
            }))
          : []),
      ]}
      metadata={[
        { label: user.email, icon: <Mail className="h-3 w-3" /> },
        {
          label: `Created ${format(new Date(user.createdAt), "MMM d, yyyy")}`,
          icon: <CalendarIcon className="h-3 w-3" />,
        },
        {
          label: `${user?._count?.assignedTickets ?? 0} assigned • ${user?._count?.createdTickets ?? 0} created`,
          icon: <Ticket className="h-3 w-3" />,
        },
        {
          label: `${user?._count?.defaultForCategories ?? 0} ${(user?._count?.defaultForCategories ?? 0) === 1 ? "category" : "categories"}`,
          icon: <TagIcon className="h-3 w-3" />,
          tooltip: {
            enabled: (user?._count?.defaultForCategories ?? 0) > 0,
            content: `${user?.defaultForCategories && user?.defaultForCategories?.length > 0 && arrayToCommaSeparatedListWithConjunction("and", user?.defaultForCategories?.map((cat) => cat?.name) ?? [])}`,
          },
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
          label: deleteLabel,
          variant: "ghost",

          disabled: !permissions?.canDeactivateUsers,
          icon:
            deleteLabel === "Remove" ? (
              <CircleMinus className="h-4 w-4" />
            ) : (
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
        },
        {
          label: "View",
          variant: "outline",
          disabled: !user?.id,
          icon: <ArrowRightCircle className="h-4 w-4" />,
          onClick: onClick,
        },
      ]}
    />
  );
}
