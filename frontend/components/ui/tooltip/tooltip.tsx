import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TooltipPortal } from "@radix-ui/react-tooltip";

type ToolTipProps = {
  trigger: React.JSX.Element;
  content: string; //  React.JSX.Element
  className?: string;
};

export function ToolTip({ trigger, content, className }: ToolTipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{trigger}</TooltipTrigger>
      <TooltipPortal>
        <TooltipContent className={className}>{content}</TooltipContent>
      </TooltipPortal>
    </Tooltip>
  );
}
