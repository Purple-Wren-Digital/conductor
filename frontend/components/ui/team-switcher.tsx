"use client";

import { useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building, Building2 } from "lucide-react";
import { useUserRole } from "@/hooks/use-user-role";
import { MarketCenter } from "@/lib/types";
import { useFetchAllMarketCenters } from "@/hooks/use-market-center";

interface TeamSwitcherProps {
  selectedMarketCenterId: string;
  setSelectedMarketCenterId: React.Dispatch<React.SetStateAction<string>>;
  handleMarketCenterSelected?: (marketCenter?: {
    name: string;
    id: string;
  }) => void;
  setMarketCenters?: React.Dispatch<
    React.SetStateAction<{ name: string; id: string }[]>
  >;
}

export function TeamSwitcher({
  selectedMarketCenterId,
  setSelectedMarketCenterId,
  handleMarketCenterSelected,
  setMarketCenters,
}: TeamSwitcherProps) {
  const { role } = useUserRole();
  const { data, isLoading } = useFetchAllMarketCenters(role);

  if (role === "AGENT") {
    return null;
  }

  const marketCenters: MarketCenter[] = useMemo(
    () => data?.marketCenters ?? [],
    [data]
  );

  return (
    <Select
      value={selectedMarketCenterId}
      onValueChange={(value) => {
        setSelectedMarketCenterId(value);
        const selectedMarketCenter = marketCenters.find((mc) => mc.id == value);
        handleMarketCenterSelected &&
          handleMarketCenterSelected(selectedMarketCenter);
      }}
      disabled={
        isLoading || !role || role === "STAFF" || role === "STAFF_LEADER"
      }
    >
      <SelectTrigger>
        <SelectValue placeholder="Select a team" />
      </SelectTrigger>
      <SelectContent>
        {role === "ADMIN" && (
          <SelectItem value="all">
            <Building2 className="h-4 w-4" />
            All Teams
          </SelectItem>
        )}
        {marketCenters &&
          marketCenters.length > 0 &&
          marketCenters.map((mc) => {
            if (!mc || !mc?.id) return null;
            if (setMarketCenters) {
              setMarketCenters((prev) => {
                const exists = prev.find((item) => item?.id === mc?.id);
                if (exists) return prev;
                return [...prev, { name: mc?.name, id: mc?.id }];
              });
            }
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
