"use client";

import { useEffect, useMemo, useState } from "react";
import { MarketCenterNotificationPreferences } from "@/components/notifications/notification-preferences/market-center-notification-preferences";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStore } from "@/context/store-provider";
import { useFetchAllMarketCenters } from "@/hooks/use-market-center";
import { useIsEnterprise } from "@/hooks/useSubscription";
import { useUserRole } from "@/hooks/use-user-role";
import type { MarketCenter } from "@/lib/types";
import { AlertCircle } from "lucide-react";

export default function MarketCenterNotificationsPreferencesShell() {
  const [selectedMarketCenterId, setSelectedMarketCenterId] =
    useState<string>("");
  const [selectedMarketCenterName, setSelectedMarketCenterName] =
    useState<string>("Select a Market Center");

  const { currentUser } = useStore();
  const { isEnterprise } = useIsEnterprise();
  const { role, isSuperuser } = useUserRole();

  useEffect(() => {
    if (isEnterprise || isSuperuser || !currentUser?.marketCenterId) return;
    setSelectedMarketCenterId(currentUser.marketCenterId);
  }, [isEnterprise, isSuperuser, currentUser?.marketCenterId]);
  const canAccess = role === "ADMIN" || role === "STAFF_LEADER";

  const { data: marketCentersData, isLoading: isLoadingMarketCenters } =
    useFetchAllMarketCenters(role);

  const marketCenters: MarketCenter[] = useMemo(
    () => marketCentersData?.marketCenters ?? [],
    [marketCentersData]
  );

  useEffect(() => {
    const selectedMC = marketCenters.find(
      (mc) => mc?.id === selectedMarketCenterId
    );
    if (selectedMC) {
      setSelectedMarketCenterName(selectedMC.name);
    } else {
      setSelectedMarketCenterName("Select a Market Center");
    }
  }, [selectedMarketCenterId, marketCenters]);

  // Permission denied view
  if (!canAccess) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-lg font-semibold mb-2">Access Denied</h2>
        <p className="text-muted-foreground">
          You do not have permission to view notification preferences for Market
          Centers.
        </p>
      </div>
    );
  }

  // No market centers available
  if (marketCenters.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-lg font-semibold mb-2">No Market Centers</h2>
        <p className="text-muted-foreground">
          No market centers available. Please create a market center first.
        </p>
      </div>
    );
  }
  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Market Center Notification Preferences
          </h1>
          <p className="text-muted-foreground">
            Enable or disable activity notifications for your market center
          </p>
        </div>

        {/* Market Center Selector */}
        <div className="w-full sm:w-64">
          <Select
            value={selectedMarketCenterId}
            onValueChange={setSelectedMarketCenterId}
          >
            <SelectTrigger role="combobox">
              <SelectValue placeholder="Select Market Center" />
            </SelectTrigger>
            <SelectContent>
              {marketCenters.map((mc) => (
                <SelectItem key={mc.id} value={mc.id}>
                  {mc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedMarketCenterId && (
        <MarketCenterNotificationPreferences
          marketCenterId={selectedMarketCenterId}
          selectedMarketCenterName={selectedMarketCenterName}
          isLoadingMarketCenters={isLoadingMarketCenters}
        />
      )}
    </div>
  );
}
