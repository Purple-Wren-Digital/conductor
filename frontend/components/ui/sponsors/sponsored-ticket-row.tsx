"use client";

import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  useSponsorSlot,
  type SponsorDisplaySlot,
} from "@/hooks/use-sponsor-display";

// =============================================================================
// PRESENTATIONAL VIEW
// =============================================================================

export interface SponsoredTicketRowViewProps {
  slot: SponsorDisplaySlot;
  colSpan: number;
}

export function SponsoredTicketRowView({
  slot,
  colSpan,
}: SponsoredTicketRowViewProps) {
  const content = (
    <div className="flex items-center gap-3">
      <Badge
        variant="secondary"
        className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground"
      >
        Sponsored
      </Badge>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={slot.imageUrl}
        alt={slot.name ?? "Sponsor"}
        className="h-10 w-auto max-w-[80px] shrink-0 object-contain"
      />
      <span className="truncate text-sm font-medium">
        {slot.name ?? "Sponsor"}
      </span>
    </div>
  );

  return (
    <TableRow className="cursor-default bg-muted/50" data-testid="partner-row">
      <TableCell colSpan={colSpan} className="py-2">
        {slot.linkUrl ? (
          <a
            href={slot.linkUrl}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="flex items-center gap-3 hover:underline"
          >
            {content}
          </a>
        ) : (
          content
        )}
      </TableCell>
    </TableRow>
  );
}

// =============================================================================
// CONNECTED (live) COMPONENT
// =============================================================================

export function SponsoredTicketRow({ colSpan }: { colSpan: number }) {
  const sponsor = useSponsorSlot("ticketListRow");

  if (!sponsor) return null;

  return <SponsoredTicketRowView slot={sponsor} colSpan={colSpan} />;
}
