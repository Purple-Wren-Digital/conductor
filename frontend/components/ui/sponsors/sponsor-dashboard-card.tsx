"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  useSponsorSlot,
  type SponsorDisplaySlot,
} from "@/hooks/use-sponsor-display";

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
    <Card className="relative h-full gap-0 overflow-hidden py-0">
      <CardContent className="relative min-h-[140px] h-full p-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={slot.imageUrl}
          alt={slot.name ?? "Sponsor"}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <Badge
          variant="secondary"
          className="absolute top-2 right-2 bg-background/80 text-[10px] uppercase tracking-wide text-muted-foreground"
        >
          Sponsored
        </Badge>
        {slot.name && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-3 py-2">
            <p className="truncate text-xs font-medium text-white">
              {slot.name}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (!slot.linkUrl) return card;

  return (
    <a
      href={slot.linkUrl}
      target="_blank"
      rel="noopener noreferrer sponsored"
      aria-label={slot.name ?? "Sponsor"}
      className="block h-full transition-colors hover:opacity-90"
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
