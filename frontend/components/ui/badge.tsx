"use client";

import { Slot } from "@radix-ui/react-slot";
import { type VariantProps, cva } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/cn";

export const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow]",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive:
          "border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
        outline:
          "text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",

        success:
          "border-transparent bg-emerald-600 text-white [a&]:hover:bg-emerald-600/90",
        warning:
          "border-transparent bg-yellow-400 text-yellow-950 [a&]:hover:bg-yellow-400/90",
        orange:
          "border-transparent bg-orange-500 text-white [a&]:hover:bg-orange-500/90",

        category: "border text-foreground",
        high: "border-transparent bg-[#FEF3F2] text-[#B42318]",
        medium: "border-transparent bg-[#FFF6ED] text-[#C4320A]",
        low: "border-transparent bg-[#EEF4FF] text-[#414651]",

        created: "border-transparent bg-[#FEF3F2] text-[#B42318] font-semibold",
        assigned:
          "border-transparent bg-[#FFFDDA] text-[#C18900] font-semibold",
        unassigned:
          "border-transparent bg-[#FFF6ED] text-[#C4320A] font-semibold",
        awaiting_response:
          "border-transparent bg-[#F9F5FF] text-[#6B21A8] font-semibold",
        in_progress:
          "border-transparent bg-[#EFF8FF] text-[#3538CD] font-semibold",
        resolved:
          "border-transparent bg-[#ECFDF3] text-[#027A48] font-semibold",
        //         created: "border-[#B42318] bg-[#FEF3F2] text-[#B42318] font-semibold",
        // assigned: "border-[#C18900] bg-[#FFFDDA] text-[#C18900] font-semibold",
        // unassigned:
        //   "border-[#C4320A] bg-[#FFF6ED] text-[#C4320A] font-semibold",
        // awaiting_response:
        //   "border-[#6B21A8] bg-[#EFF8FF] text-[#6B21A8] font-semibold",
        // in_progress:
        //   "border-[#3538CD] bg-[#EFF8FF] text-[#3538CD] font-semibold",
        // resolved: "border-[#027A48] bg-[#ECFDF3] text-[#027A48] font-semibold",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  asChild?: boolean;
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "span";
    return (
      <Comp
        ref={ref}
        data-slot="badge"
        className={cn(badgeVariants({ variant }), className)}
        {...props}
      />
    );
  }
);

Badge.displayName = "Badge";
