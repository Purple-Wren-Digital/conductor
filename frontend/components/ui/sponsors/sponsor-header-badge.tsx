"use client";

import { cn } from "@/lib/cn";
import {
  useSponsorSlot,
  type SponsorDisplaySlot,
} from "@/hooks/use-sponsor-display";

// =============================================================================
// PRESENTATIONAL VIEW
// =============================================================================

export interface SponsorHeaderBadgeViewProps {
  slot: SponsorDisplaySlot;
  /**
   * The real header badge is `hidden md:flex` so it collapses on small
   * viewports. Settings previews render inside a fixed-width mock header and
   * need the badge visible regardless of the current breakpoint.
   */
  alwaysVisible?: boolean;
  className?: string;
}

export function SponsorHeaderBadgeView({
  slot,
  alwaysVisible = false,
  className,
}: SponsorHeaderBadgeViewProps) {
  const content = (
    <>
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted/80 whitespace-nowrap">
        Powered by
      </span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={slot.imageUrl}
        alt={slot.name ?? "Sponsor"}
        className="h-8 max-h-10 w-auto object-contain"
      />
    </>
  );

  return (
    <div
      className={cn(
        "items-center gap-2",
        alwaysVisible ? "flex" : "hidden md:flex",
        className
      )}
    >
      {slot.linkUrl ? (
        <a
          href={slot.linkUrl}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="flex items-center gap-2"
        >
          {content}
        </a>
      ) : (
        content
      )}
    </div>
  );
}

// =============================================================================
// CONNECTED (live) COMPONENT
// =============================================================================

export function SponsorHeaderBadge() {
  const sponsor = useSponsorSlot("header");

  if (!sponsor) return null;

  return <SponsorHeaderBadgeView slot={sponsor} />;
}
