"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFetchTemplateStatuses } from "@/hooks/use-template-customization";
import { useFetchAllMarketCenters } from "@/hooks/use-market-center";
import type { MarketCenter } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Mail, Bell, AlertCircle, Building2 } from "lucide-react";
import { useStore } from "@/context/store-provider";
import { useUserRole } from "@/hooks/use-user-role";
import { useIsEnterprise } from "@/hooks/useSubscription";

export default function TemplateCustomizationList() {
  const router = useRouter();
  const [selectedMarketCenterId, setSelectedMarketCenterId] =
    useState<string>("");

  const { currentUser } = useStore();
  const { isEnterprise } = useIsEnterprise();

  useEffect(() => {
    if (isEnterprise || !currentUser?.marketCenterId) return;
    setSelectedMarketCenterId(currentUser.marketCenterId);
  }, [isEnterprise, currentUser?.marketCenterId]);

  const { role } = useUserRole();
  const canAccess = role === "ADMIN" || role === "STAFF_LEADER";

  // Fetch market centers
  const { data: marketCentersData, isLoading: isLoadingMarketCenters } =
    useFetchAllMarketCenters(role);

  // Fetch template statuses
  const {
    data: templates,
    isLoading: isLoadingTemplates,
    isError,
    error,
    refetch,
  } = useFetchTemplateStatuses({
    marketCenterId: selectedMarketCenterId,
    role,
  });

  const marketCenters: MarketCenter[] = marketCentersData?.marketCenters ?? [];

  // Permission denied view
  if (!canAccess) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-lg font-semibold mb-2">Access Denied</h2>
        <p className="text-muted-foreground">
          You do not have permission to view notification templates.
        </p>
      </div>
    );
  }

  // Loading state
  if (isLoadingMarketCenters) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton data-slot="skeleton" className="h-8 w-64" />
          <Skeleton data-slot="skeleton" className="h-10 w-48" />
        </div>
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} data-slot="skeleton" className="h-16 w-full" />
          ))}
        </div>
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

  // Navigate to editor
  const handleEditEmail = (templateType: string) => {
    if (!selectedMarketCenterId) return;
    router.push(
      `/dashboard/template-customization/${selectedMarketCenterId}/${templateType}/email`
    );
  };

  const handleEditInApp = (templateType: string) => {
    if (!selectedMarketCenterId) return;
    router.push(
      `/dashboard/template-customization/${selectedMarketCenterId}/${templateType}/in-app`
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notification Templates</h1>
          <p className="text-muted-foreground">
            Customize email and in-app notification templates for your market
            center
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

      {/* No market center selected */}
      {!selectedMarketCenterId && (
        <div className="flex flex-col items-center justify-center py-12 border rounded-lg bg-muted/30">
          <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold mb-2">Select a Market Center</h2>
          <p className="text-muted-foreground">
            Select a market center to view and customize notification templates.
          </p>
        </div>
      )}

      {/* Loading templates */}
      {selectedMarketCenterId && isLoadingTemplates && (
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} data-slot="skeleton" className="h-16 w-full" />
          ))}
        </div>
      )}

      {/* Error state */}
      {selectedMarketCenterId && isError && (
        <div className="flex flex-col items-center justify-center py-12 border rounded-lg bg-destructive/10">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h2 className="text-lg font-semibold mb-2">
            Failed to Load Templates
          </h2>
          <p className="text-muted-foreground mb-4">
            {error?.message || "An error occurred while loading templates."}
          </p>
          <Button onClick={() => refetch()} variant="outline">
            Retry
          </Button>
        </div>
      )}

      {/* Template list */}
      {selectedMarketCenterId && templates && !isError && (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Template</TableHead>
                <TableHead>Email Status</TableHead>
                <TableHead>In-App Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template) => (
                <TableRow key={template.templateType}>
                  <TableCell className="font-medium">
                    {template.label}
                  </TableCell>
                  <TableCell>
                    {template.hasEmailCustomization ? (
                      <Badge variant="default" className="bg-primary">
                        Customized
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Default</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {template.hasInAppCustomization ? (
                      <Badge variant="default" className="bg-primary">
                        Customized
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Default</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditEmail(template.templateType)}
                        aria-label={`Edit email template for ${template.label}`}
                      >
                        <Mail className="h-4 w-4 mr-1" />
                        Edit Email
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditInApp(template.templateType)}
                        aria-label={`Edit in-app template for ${template.label}`}
                      >
                        <Bell className="h-4 w-4 mr-1" />
                        Edit In-App
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
