"use client";

import * as React from "react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/ui/ratingInput/star-rating-static";
import { TableCell, TableRow } from "@/components/ui/table";
import type { MarketCenter, SurveyResults } from "@/lib/types";
import { CircleMinus } from "lucide-react";
import { useFetchRatingsByMarketCenter } from "@/hooks/use-tickets";
import { useUserRole } from "@/hooks/use-user-role";

export default function MarketCentersTable({
  marketCenter,
  onEdit,
  onDelete,
  onClick,
}: {
  marketCenter: MarketCenter;
  onEdit: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
  onClick?: () => void;
}) {
  const { permissions, role } = useUserRole();

  const { data: ratingsData } = useFetchRatingsByMarketCenter(
    ["ratings-by-market-center", marketCenter.id],
    marketCenter.id
  );

  const marketCenterRatings: SurveyResults = useMemo(() => {
    return ratingsData;
  }, [ratingsData]);

  return (
    <TableRow
      className="p-2 align-center cursor-pointer hover:bg-muted"
      data-ticket-id={marketCenter.id}
    >
      <TableCell className="flex gap-2 items-center">
        <div className="flex flex-col gap-1" onClick={onClick}>
          <p className="font-medium hover:underline">
            {marketCenter?.name ?? "No Name"}
          </p>
          <span className="whitespace-nowrap text-xs text-muted-foreground">
            #{marketCenter.id.slice(0, 8)}
          </span>
        </div>
      </TableCell>
      <TableCell className="text-center">
        <div className="flex justify-center">
          <StarRating
            size={14}
            rating={
              marketCenterRatings?.marketCenterAverageRating
                ? marketCenterRatings.marketCenterAverageRating
                : 0
            }
          />
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-col items-center gap-1">
          <p className="text-muted-foreground font-medium">
            {marketCenter?.totalTickets
              ? String(marketCenter?.totalTickets)
              : "0"}
          </p>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-col items-center gap-1">
          <p className="text-muted-foreground font-medium">
            {marketCenter?.users && marketCenter?.users.length
              ? String(marketCenter?.users.length)
              : "0"}
          </p>
        </div>
      </TableCell>
      <TableCell className="text-center">
        {marketCenter?.ticketCategories && marketCenter?.ticketCategories.length
          ? String(marketCenter?.ticketCategories.length)
          : "0"}
      </TableCell>

      <TableCell className="flex gap-2 items-center justify-center">
        <Button
          variant="outline"
          size="sm"
          onClick={onEdit}
          disabled={!role || !permissions?.canManageAllMarketCenters}
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
          disabled={!role || !permissions?.canDeactivateMarketCenters}
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
