"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import {
  useSponsorSlot,
  type SponsorDisplaySlot,
} from "@/hooks/use-sponsor-display";

/**
 * The card spans two columns of the dashboard stat grid. Sponsor creatives are
 * usually horizontal logos/wordmarks, and a single stat-width column is close
 * to square — contained inside one, a wide logo renders too small to read. The
 * stat rows in `components/dashboard/*-dashboard.tsx` widen from
 * `md:grid-cols-4` to `md:grid-cols-6` when this slot is filled to make room.
 */
const GRID_SPAN = "col-span-2";

// =============================================================================
// PRESENTATIONAL VIEW
// =============================================================================

export interface SponsorDashboardCardViewProps {
  slot: SponsorDisplaySlot;
}

export function SponsorDashboardCardView({
  slot,
}: SponsorDashboardCardViewProps) {
  const card = (
    <Card className="h-full gap-0 overflow-hidden py-0">
      <CardContent className="flex h-full min-h-[140px] flex-col p-0">
        {/*
          `object-contain` scales the creative down to fit on whichever axis
          binds first and centres it on the other, so nothing is ever cropped
          regardless of the uploaded aspect ratio.

          The image stays absolutely positioned — and so out of flow — on
          purpose. In normal flow a tall or square creative sizes the card to
          its own intrinsic height, and because grid rows stretch, that drags
          every sibling stat card to match (a 400px-square upload produced a
          ~500px-tall stats row). Out of flow, the card's height stays governed
          by the row and the creative fits itself into whatever box it gets.
        */}
        <div className="relative min-h-0 flex-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={slot.imageUrl}
            alt={slot.name ?? "Sponsor"}
            className="absolute inset-0 h-full w-full object-contain p-4"
          />
        </div>

        {/*
          The attribution sits in normal flow below the creative rather than
          overlaying it — a gradient scrim reads fine over a full-bleed photo
          but clips the bottom of a contained logo.
        */}
        <div className="flex items-center justify-between gap-2 border-t bg-muted/40 px-3 py-1.5">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Sponsored
          </span>
          {slot.name && (
            <span className="truncate text-xs font-medium">{slot.name}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (!slot.linkUrl) return <div className={GRID_SPAN}>{card}</div>;

  return (
    <a
      href={slot.linkUrl}
      target="_blank"
      rel="noopener noreferrer sponsored"
      aria-label={slot.name ?? "Sponsor"}
      className={cn(GRID_SPAN, "block h-full transition-opacity hover:opacity-90")}
    >
      {card}
    </a>
  );
}

// =============================================================================
// CONNECTED (live) COMPONENT
// =============================================================================

export function SponsorDashboardCard() {
  const sponsor = useSponsorSlot("dashboardCard");

  if (!sponsor) return null;

  return <SponsorDashboardCardView slot={sponsor} />;
}
