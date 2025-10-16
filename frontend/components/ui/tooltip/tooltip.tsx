import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type ToolTipProps = {
  trigger: React.JSX.Element;
  content: string; //  React.JSX.Element
};

export function ToolTip({ trigger, content }: ToolTipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{trigger}</TooltipTrigger>
      <TooltipContent>{content}</TooltipContent>
    </Tooltip>
  );
}
