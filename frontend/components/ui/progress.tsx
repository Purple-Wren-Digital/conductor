"use client";

import * as ProgressPrimitive from "@radix-ui/react-progress";
import type * as React from "react";

import { cn } from "@/lib/cn";

function Progress({
  className,
  value,
  getValueLabel,
  max,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  return (
    <ProgressPrimitive.Root
      id="progress-root"
      data-slot="progress"
      className={cn(
        "bg-[#6D1C24]/20 relative h-2 w-full overflow-hidden rounded-full",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        id="progress-indicator"
        data-slot="progress-indicator"
        className="bg-[#6D1C24] h-full w-full flex-1 transition-all"
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      >
        <span className="sr-only">
          {getValueLabel
            ? getValueLabel(value || 0, max || 100)
            : `${value || 0}%`}
        </span>
      </ProgressPrimitive.Indicator>
    </ProgressPrimitive.Root>
  );
}

export { Progress };
