"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/cn";


export function hashString(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function getCategoryStyle(category: string): React.CSSProperties {
  const hue = hashString(category) % 360;
  const bg = `hsl(${hue}, 70%, 85%)`;
  const border = `hsl(${hue}, 60%, 70%)`;
  const color = `hsl(222, 14%, 12%)`;
  return { backgroundColor: bg, borderColor: border, color };
}

export function getStatusBadgeStyle(status: string): React.CSSProperties | undefined {
  switch (status) {
    case "RESOLVED": 
      return { backgroundColor: "#16a34a", color: "white", borderColor: "#15803d" };
    case "IN_PROGRESS":
      return undefined; 
    case "ASSIGNED":
      return undefined;
    case "AWAITING_RESPONSE":
      return undefined;
    default:
      return undefined;
  }
}

export function getUrgencyBadgeStyle(urgency: string): React.CSSProperties | undefined {
  switch (urgency) {
    case "HIGH": 
      return { backgroundColor: "#ef4444", color: "white", borderColor: "#dc2626" };
    case "MEDIUM": 
      return { backgroundColor: "#fb923c", color: "#111827", borderColor: "#f97316" };
    case "LOW": 
      return { backgroundColor: "#fde047", color: "#111827", borderColor: "#facc15" };
    default:
      return undefined;
  }
}

export function getRoleBadgeStyle(role: string): React.CSSProperties | undefined {
  switch (role) {
    case "ADMIN":
      return { backgroundColor: "#ef4444", color: "white", borderColor: "#dc2626" };
    case "STAFF":
      return undefined;
    case "USER":
      return { backgroundColor: "#e5e7eb", color: "#111827", borderColor: "#d1d5db" };
    default:
      return undefined;
  }
}

export const getStatusColor = (status: string) => {
  switch (status) {
    case "RESOLVED":
      return "success";
    case "IN_PROGRESS":
      return "default";
    case "ASSIGNED":
      return "secondary";
    case "AWAITING_RESPONSE":
      return "outline";
    default:
      return "secondary";
  }
};
export const getUrgencyColor = (urgency: string) => {
  switch (urgency) {
    case "HIGH":
      return "destructive";
    case "MEDIUM":
      return "orange";
    case "LOW":
      return "warning";
    default:
      return "secondary";
  }
};
export const getRoleColor = (role: string) => {
  switch (role) {
    case "ADMIN":
      return "destructive";
    case "STAFF":
      return "default";
    case "USER":
      return "secondary";
    default:
      return "secondary";
  }
};


export interface BaseAction {
  label: string;
  icon: React.ReactNode;
  onClick: (e: React.MouseEvent) => void;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
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

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-4 border rounded-lg transition-colors",
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
      {selectable && (
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
          <AvatarFallback className="text-sm font-medium">{avatar.fallback}</AvatarFallback>
        </Avatar>
      )}

      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3
              className={cn(
                "font-medium text-sm leading-5 truncate",
                isClickable && "hover:underline text-primary"
              )}
              title={title}
            >
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate" title={subtitle}>
                {subtitle}
              </p>
            )}
          </div>

          {primaryBadges.length > 0 && (
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {primaryBadges.map((badge, i) => (
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
          )}
        </div>

        {secondaryBadges.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {secondaryBadges.map((badge, i) => (
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
        )}

        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
          {metadata.map((m, i) => (
            <span key={i} className="flex items-center gap-1 whitespace-nowrap">
              {m.icon}
              {m.label}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-end gap-1 flex-shrink-0">
        {actions.map((a, i) => (
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
            <span className="ml-1 hidden sm:inline">{a.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
