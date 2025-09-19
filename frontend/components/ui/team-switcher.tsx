"use client";

import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2 } from "lucide-react";
import { useUserRole } from "@/lib/hooks/use-user-role";
import { useQuery } from "@tanstack/react-query";
import { getAccessToken } from "@auth0/nextjs-auth0";

interface MarketCenter {
  id: string;
  name: string;
  slug: string;
}

interface TeamSwitcherProps {
  selectedMarketCenterId: string | null;
  onMarketCenterChange: (marketCenterId: string | null) => void;
}

export function TeamSwitcher({ selectedMarketCenterId, onMarketCenterChange }: TeamSwitcherProps) {
  const { role } = useUserRole();
  const [isLoading, setIsLoading] = useState(false);

  const { data: marketCentersData } = useQuery({
    queryKey: ["marketCenters"],
    queryFn: async () => {
      const accessToken = process.env.NODE_ENV === "development" ? "local" : await getAccessToken();
      const res = await fetch("/api/settings/market-centers", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error("Failed to fetch market centers");
      return res.json();
    },
    enabled: role === "ADMIN",
    staleTime: 5 * 60 * 1000,
  });

  const marketCenters: MarketCenter[] = marketCentersData?.marketCenters ?? [];

  if (role !== "ADMIN") {
    return null;
  }

  return (
    <div className="flex items-center gap-2 p-2 border rounded-lg bg-background">
      <Building2 className="h-4 w-4 text-muted-foreground" />
      <Select
        value={selectedMarketCenterId || "all"}
        onValueChange={(value) => {
          setIsLoading(true);
          onMarketCenterChange(value === "all" ? null : value);
          setTimeout(() => setIsLoading(false), 500);
        }}
        disabled={isLoading}
      >
        <SelectTrigger className="w-[200px] h-8">
          <SelectValue placeholder="Select a team" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Teams</SelectItem>
          {marketCenters.map((mc) => (
            <SelectItem key={mc.id} value={mc.id}>
              {mc.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}