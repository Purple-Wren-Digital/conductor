"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog/base-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TooltipPortal } from "@radix-ui/react-tooltip";
import { useIsMobile } from "@/hooks/use-mobile";
import { InfoIcon } from "lucide-react";

type ToolTipProps = {
  trigger: React.JSX.Element;
  content: string; //  React.JSX.Element
  className?: string;
  classNameMobile?: string;
  classNameMobileButton?: string;
  iconClassName?: string;
};

export function ToolTip({
  trigger,
  content,
  className,
  classNameMobile,
  classNameMobileButton,
  iconClassName,
}: ToolTipProps) {
  const [isMobileTooltipOpen, setIsMobileTooltipOpen] = useState(false);
  const isMobile = useIsMobile();

  const triggerIsButton =
    (typeof trigger?.type === "string" && trigger.type === "button") ||
    trigger?.type === Button ||
    typeof trigger?.props?.onClick === "function";

  const openMobileTooltip = () => {
    setIsMobileTooltipOpen(true);
  };

  if (isMobile && triggerIsButton) {
    return (
      <div
        className={`flex items-center gap-2 justify-between ${classNameMobile}`}
      >
        {trigger}
        <Button
          onClick={openMobileTooltip}
          variant="ghost"
          size="sm"
          className={classNameMobileButton}
        >
          <InfoIcon
            className={`${iconClassName ? iconClassName : "size-4 text-muted-foreground"}`}
          />
        </Button>
        <Dialog
          open={isMobileTooltipOpen}
          onOpenChange={setIsMobileTooltipOpen}
        >
          <DialogContent>
            <DialogHeader className="absolute left-5.75 top-4">
              <DialogTitle
                className="text-muted-foreground"
                aria-label="Tooltip information modal"
              >
                <InfoIcon className="size-4" />
              </DialogTitle>
            </DialogHeader>
            <p className="font-medium">{content}</p>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (isMobile && !triggerIsButton) {
    return (
      <>
        <Button
          onClick={openMobileTooltip}
          variant="ghost"
          className={className}
        >
          {trigger}
        </Button>

        <Dialog
          open={isMobileTooltipOpen}
          onOpenChange={setIsMobileTooltipOpen}
        >
          <DialogContent>
            <DialogHeader className="absolute left-5.75 top-4">
              <DialogTitle
                className="text-muted-foreground"
                aria-label="Tooltip information modal"
              >
                <InfoIcon className="size-4" />
              </DialogTitle>
            </DialogHeader>
            <p className="font-medium mt-4">{content}</p>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{trigger}</TooltipTrigger>
      <TooltipPortal>
        <TooltipContent sideOffset={4}>{content}</TooltipContent>
      </TooltipPortal>
    </Tooltip>
  );
}

