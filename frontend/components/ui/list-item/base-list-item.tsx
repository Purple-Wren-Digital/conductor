"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/cn";
import { useStore } from "@/context/store-provider";
import { ToolTip } from "@/components/ui/tooltip/tooltip";

export interface BaseAction {
  label: string;
  icon: React.ReactNode;
  onClick: (e: React.MouseEvent) => void;
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  disabled?: boolean;
  title?: string;
}

export interface BaseBadge {
  label: string;
  variant?: string;
  style?: React.CSSProperties;
  title?: string;
}

export interface BaseListItemProps {
  id: string;
  title: string;
  subtitle?: string;
  avatar?: {
    fallback: string;
  };
  primaryBadges?: BaseBadge[];
  secondaryBadges?: BaseBadge[];
  metadata: Array<{
    label: string;
    icon?: React.ReactNode;
    tooltip?: { enabled: boolean; content: string };
  }>;
  actions: BaseAction[];
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (checked: boolean) => void;
  onClick?: () => void;
  className?: string;
}

export function ListItem({
  title,
  subtitle,
  avatar,
  primaryBadges = [],
  secondaryBadges = [],
  metadata,
  actions,
  selectable = false,
  selected = false,
  onSelect,
  onClick,
  className,
}: BaseListItemProps) {
  const isClickable = !!onClick;

  const { currentUser } = useStore();

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row items-start gap-3 p-4 border rounded-lg transition-colors",
        isClickable && "hover:bg-muted/50 cursor-pointer",
        className
      )}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={isClickable ? () => onClick?.() : undefined}
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
    >
      {selectable && currentUser?.role !== "AGENT" && (
        <Checkbox
          checked={selected}
          onCheckedChange={(v) => onSelect?.(!!v)}
          className="mt-1"
          // prevent row click
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        />
      )}

      {avatar && (
        <Avatar className="h-10 w-10 mt-0.5">
          <AvatarFallback className="text-sm font-medium">
            {avatar.fallback}
          </AvatarFallback>
        </Avatar>
      )}

      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3
              className={cn(
                "font-medium text-sm leading-5 text-ellipsis",
                isClickable && "hover:underline text-primary"
              )}
              title={title}
            >
              {title}
            </h3>
            {subtitle && (
              <p
                className="text-xs text-muted-foreground mt-0.5 text-ellipsis"
                title={subtitle}
              >
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {primaryBadges.length > 0 &&
            primaryBadges.map((badge, i) => (
              <Badge
                key={i}
                variant={badge.variant as any}
                style={badge.style}
                title={badge.title}
                className="text-xs px-2 py-0.5"
              >
                {badge.label}
              </Badge>
            ))}
          {secondaryBadges.length > 0 &&
            secondaryBadges.map((badge, i) => (
              <Badge
                key={i}
                variant={badge.variant as any}
                style={badge.style}
                title={badge.title}
                className="text-xs px-2 py-0.5"
              >
                {badge.label}
              </Badge>
            ))}
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
          {metadata &&
            metadata.map((m, i) => (
              <React.Fragment key={`${i}-meta-${m.label}`}>
                {m.tooltip?.enabled ? (
                  <ToolTip
                    content={m.tooltip.content}
                    trigger={
                      <span className="flex items-center gap-1 whitespace-nowrap">
                        {m.icon}
                        {m.label}
                      </span>
                    }
                  />
                ) : (
                  <span className="flex items-center gap-1 whitespace-nowrap">
                    {m.icon}
                    {m.label}
                  </span>
                )}
              </React.Fragment>
            ))}
        </div>
      </div>

      {currentUser?.role !== "AGENT" && (
        <div className="flex flex-wrap flex-row gap-1 flex-shrink-0 w-full items-center sm:w-auto sm:justify-end">
          {actions &&
            actions.map((a, i) => (
              <Button
                key={i}
                variant={a.variant || "ghost"}
                size="sm"
                className="h-8 px-2 text-xs min-w-0"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!a.disabled) a.onClick(e);
                }}
                disabled={a.disabled}
                title={a.title}
                type="button"
              >
                {a.icon}
                <span className="ml-1">{a.label}</span>
              </Button>
            ))}
        </div>
      )}
    </div>
  );
}
