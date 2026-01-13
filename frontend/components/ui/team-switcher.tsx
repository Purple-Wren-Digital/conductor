"use client";

import { useEffect, useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BanIcon, Building, Building2 } from "lucide-react";
import { useUserRole } from "@/hooks/use-user-role";
import { MarketCenter } from "@/lib/types";
import { useFetchAllMarketCenters } from "@/hooks/use-market-center";
import { useIsEnterprise } from "@/hooks/useSubscription";

interface TeamSwitcherProps {
  selectedMarketCenterId: string;
  setSelectedMarketCenterId: React.Dispatch<React.SetStateAction<string>>;
  handleMarketCenterSelected?: (marketCenter?: MarketCenter) => void;
  setMarketCenters?: React.Dispatch<
    React.SetStateAction<{ name: string; id: string }[]>
  >;
  unassigned?: "Unassigned";
}

export function TeamSwitcher({
  selectedMarketCenterId,
  setSelectedMarketCenterId,
  handleMarketCenterSelected,
  setMarketCenters,
  unassigned,
}: TeamSwitcherProps) {
  const { role } = useUserRole();
  const { data, isLoading } = useFetchAllMarketCenters(role);
  const { isEnterprise } = useIsEnterprise();

  const marketCenters: MarketCenter[] = useMemo(
    () => data?.marketCenters ?? [],
    [data]
  );

  // Only show "All Teams" option if user is Admin with Enterprise subscription
  // and has access to multiple market centers
  const canViewAllTeams = marketCenters.length > 0;

  useEffect(() => {
    if (!setMarketCenters || !marketCenters) return;

    setMarketCenters((prev) => {
      const updated = [...prev];

      marketCenters.forEach((mc) => {
        if (mc && !updated.some((item) => item.id === mc.id)) {
          updated.push({ name: mc.name, id: mc.id });
        }
      });

      return updated;
    });
  }, [marketCenters, setMarketCenters]);

  return (
    <Select
      value={selectedMarketCenterId}
      onValueChange={(value) => {
        if (!isEnterprise && !unassigned) return;
        setSelectedMarketCenterId(value);
        const selectedMarketCenter = marketCenters.find((mc) => mc.id == value);
        handleMarketCenterSelected &&
          handleMarketCenterSelected(selectedMarketCenter);
      }}
      disabled={isLoading || !canViewAllTeams}
    >
      <SelectTrigger>
        <SelectValue placeholder="Select a team" />
      </SelectTrigger>
      <SelectContent>
        {isEnterprise && canViewAllTeams && (
          <SelectItem value="all">
            <Building2 className="h-4 w-4" />
            All Teams
          </SelectItem>
        )}
        {unassigned && (
          <SelectItem value="Unassigned">
            <BanIcon className="h-4 w-4" />
            Unassigned
          </SelectItem>
        )}
        {marketCenters &&
          marketCenters.length > 0 &&
          marketCenters.map((mc) => {
            if (!mc || !mc?.id) return null;
            return (
              <SelectItem key={mc.id} value={mc.id}>
                <Building className="h-4 w-4" />

                {mc.name}
              </SelectItem>
            );
          })}
      </SelectContent>
    </Select>
  );
}
