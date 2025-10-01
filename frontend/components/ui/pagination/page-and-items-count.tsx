"use client";

import { formatPaginationText } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type React from "react";
import { Button } from "@/components/ui/button";

export type PagesAndItemsCountProps = {
  type: "tickets" | "users" | "market centers";
  totalItems: number;
  itemsPerPage: number;
  currentPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  totalPages: number;
};

export default function PagesAndItemsCount({
  type,
  totalItems,
  itemsPerPage,
  currentPage,
  setCurrentPage,
  totalPages,
}: PagesAndItemsCountProps) {
  return (
    <div className="flex items-center justify-between pt-4">
      <div className="text-sm text-muted-foreground">
        Showing{" "}
        {formatPaginationText({
          totalItems,
          itemsPerPage,
          currentPage,
        })}{" "}
        out of {totalItems} {type}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage((p) => p - 1)}
          disabled={currentPage === 1 || totalItems === 0}
          type="button"
        >
          <ChevronLeft className="h-4 w-4" /> Previous
        </Button>
        <span className="text-sm">
          {currentPage} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage((p) => p + 1)}
          disabled={currentPage === totalPages || totalItems === 0}
          type="button"
        >
          Next <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
