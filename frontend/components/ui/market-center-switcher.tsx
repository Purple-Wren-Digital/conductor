"use client";

import { useStore } from "@/context/store-provider";
import { useSwitchMarketCenter } from "@/hooks/use-switch-market-center";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function MarketCenterSwitcher() {
  const { currentUser } = useStore();
  const switchMutation = useSwitchMarketCenter();

  const marketCenters = currentUser?.marketCenters;

  // No MCs or only 1 — show static text
  if (!marketCenters || marketCenters.length <= 1) {
    const name =
      currentUser?.marketCenter?.name ??
      (currentUser?.marketCenterId
        ? `#${currentUser.marketCenterId.slice(0, 8)}`
        : "No Market Center Assigned");
    return <span className="text-xs text-muted-foreground">{name}</span>;
  }

  return (
    <Select
      value={currentUser?.marketCenterId ?? undefined}
      onValueChange={(value) => {
        if (value !== currentUser?.marketCenterId) {
          switchMutation.mutate(value);
        }
      }}
      disabled={switchMutation.isPending}
    >
      <SelectTrigger className="h-6 text-xs border-none shadow-none px-0 py-0 gap-1 text-muted-foreground w-auto">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {marketCenters.map((mc) => (
          <SelectItem key={mc.id} value={mc.id}>
            {mc.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
