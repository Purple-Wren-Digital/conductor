"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/ui/ratingInput/star-rating-static";
import { TableCell, TableRow } from "@/components/ui/table";
import type { PrismaUser, UserRole } from "@/lib/types";
import { getCategoryStyle, ROLE_ICONS } from "@/lib/utils";
import { CircleMinus, TicketIcon, User } from "lucide-react";
import { useFetchRatingsByAssignee } from "@/hooks/use-tickets";
import { useUserRole } from "@/hooks/use-user-role";

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

  const getRoleIcon = (userRole: UserRole) => {
    const Icon = ROLE_ICONS[userRole as keyof typeof ROLE_ICONS];
    return Icon ? <Icon className="h-4 w-4" /> : <User className="h-4 w-4" />;
  };

  const shouldFetchRatings = (user?._count?.assignedTickets ?? 0) > 0;

  const { data: userRatingsData } = useFetchRatingsByAssignee(
    ["ratings-by-assignee", user?.id],
    shouldFetchRatings,
    user?.id
  );

  return (
    <TableRow
      className="p-2 align-center cursor-pointer hover:bg-muted"
      data-ticket-id={user.id}
    >
      <TableCell className="flex gap-2 items-center">
        <div className="flex flex-col gap-1" onClick={onClick}>
          <p className="flex gap-2 items-center font-medium hover:underline">
            {user?.name ?? "No Name Found"}
            {!user?.isActive && (
              <span className="text-sm text-muted-foreground">(Inactive)</span>
            )}
            {!user?.marketCenterId && (
              <span className="text-sm text-muted-foreground">
                (Unassigned)
              </span>
            )}
          </p>

          <span className="flex items-center gap-1 whitespace-nowrap text-sm text-muted-foreground">
            <TicketIcon className="h-2.75 w-2.75" />
            {user?._count?.assignedTickets ?? 0} assigned •{" "}
            {user?._count?.createdTickets ?? 0} created{" "}
          </span>
          <span className="flex items-center gap-1 whitespace-nowrap text-sm text-muted-foreground">
            Avg Rating
            <StarRating
              size={12}
              rating={
                userRatingsData?.assigneeAverageRating
                  ? userRatingsData.assigneeAverageRating
                  : 0
              }
            />
          </span>
        </div>
      </TableCell>

      <TableCell className="font-medium cursor-pointer">
        {user?.email ?? "N/a"}
      </TableCell>
      <TableCell>
        <Badge
          variant={(user?.role.toLowerCase() ?? "user") as any}
          className="text-xs px-2 py-0.5"
        >
          {getRoleIcon(user?.role || "AGENT")}
          {user?.role ? user?.role.split("_").join(" ") : "N/A"}
        </Badge>
      </TableCell>
      <TableCell className="max-w-[150px]">
        {user?.defaultForCategories && user?.defaultForCategories.length > 0
          ? user?.defaultForCategories?.map((category) => (
              <Badge
                key={category.id}
                variant={"category"}
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
