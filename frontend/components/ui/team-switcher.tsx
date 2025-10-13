"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building, Building2 } from "lucide-react";
import { useUserRole } from "@/lib/hooks/use-user-role";
import { MarketCenter } from "@/lib/types";
import { useFetchAllMarketCenters } from "@/hooks/use-market-center";

interface TeamSwitcherProps {
  selectedMarketCenterId: string;
  setSelectedMarketCenterId: React.Dispatch<React.SetStateAction<string>>;
  handleMarketCenterSelected?: (marketCenter?: MarketCenter) => void;
}

export function TeamSwitcher({
  selectedMarketCenterId,
  setSelectedMarketCenterId,
  handleMarketCenterSelected,
}: TeamSwitcherProps) {
  const { role } = useUserRole();

  if (role === "AGENT") {
    return null;
  }

  const { data, isLoading } = useFetchAllMarketCenters(role);

  const marketCenters: MarketCenter[] = data?.marketCenters ?? [];

  return (
    <Select
      value={selectedMarketCenterId}
      onValueChange={(value) => {
        setSelectedMarketCenterId(value);
        const selectedMarketCenter = marketCenters.find((mc)=> mc.id == value)
        handleMarketCenterSelected && handleMarketCenterSelected(selectedMarketCenter);
      }}
      disabled={isLoading || role === "STAFF"}
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
          marketCenters.map((mc) => (
            <SelectItem key={mc.id} value={mc.id}>
              <Building className="h-4 w-4" />

              {mc.name}
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  );
}
