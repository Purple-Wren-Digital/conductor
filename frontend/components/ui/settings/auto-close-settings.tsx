"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Clock, Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  useAutoCloseSettings,
  useUpdateAutoCloseSettings,
} from "@/hooks/use-settings";
import { toast } from "sonner";
import { useStore } from "@/context/store-provider";
import { useUserRole } from "@/hooks/use-user-role";
import { useAuth } from "@clerk/nextjs";
import { useIsEnterprise } from "@/hooks/useSubscription";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFetchAllMarketCenters } from "@/hooks/use-market-center";
import type { MarketCenter } from "@/lib/types";

const autoCloseFormSchema = z.object({
  enabled: z.boolean(),
  awaitingResponseDays: z.coerce
    .number()
    .min(1, "Must be at least 1 day")
    .max(30, "Cannot exceed 30 days"),
});

type AutoCloseFormData = z.infer<typeof autoCloseFormSchema>;

export default function AutoCloseSettings() {
  const [selectedMarketCenterId, setSelectedMarketCenterId] =
    useState<string>("");

  const { getToken } = useAuth();
  const { currentUser } = useStore();
  const { isEnterprise } = useIsEnterprise();
  const { role } = useUserRole();

  const { data: marketCentersData, isLoading: isLoadingMarketCenters } =
    useFetchAllMarketCenters(role);

  const marketCenters: MarketCenter[] = useMemo(
    () => marketCentersData?.marketCenters ?? [],
    [marketCentersData]
  );

  useEffect(() => {
    const prefillMarketCenter = (defaultMarketCenterId: string) => {
      setSelectedMarketCenterId(defaultMarketCenterId);
    };
    if (isEnterprise || !currentUser?.marketCenterId) return;
    prefillMarketCenter(currentUser.marketCenterId);
  }, [isEnterprise, currentUser?.marketCenterId]);

  const {
    data: autoCloseData,
    isLoading,
    error,
  } = useAutoCloseSettings(getToken, selectedMarketCenterId);

  const updateAutoClose = useUpdateAutoCloseSettings(getToken);

  const form = useForm<AutoCloseFormData>({
    resolver: zodResolver(autoCloseFormSchema),
    defaultValues: {
      enabled: true,
      awaitingResponseDays: 2,
    },
  });

  // Update form when data loads
  useEffect(() => {
    if (autoCloseData?.autoClose) {
      form.reset({
        enabled: autoCloseData.autoClose.enabled,
        awaitingResponseDays: autoCloseData.autoClose.awaitingResponseDays,
      });
    }
  }, [autoCloseData, form]);

  const onSubmit = async (data: AutoCloseFormData) => {
    if (!selectedMarketCenterId) {
      toast.error("Market center not found");
      return;
    }

    try {
      await updateAutoClose.mutateAsync({
        marketCenterId: selectedMarketCenterId,
        enabled: data.enabled,
        awaitingResponseDays: data.awaitingResponseDays,
      });
      toast.success("Auto-close settings updated successfully");
    } catch (err) {
      toast.error("Failed to update auto-close settings");
    }
  };

  // Only STAFF_LEADER and ADMIN can access this setting
  const canAccess = role === "STAFF_LEADER" || role === "ADMIN";

  if (!canAccess) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Auto-Close Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You do not have permission to view or modify auto-close settings.
              Only Staff Leaders and Administrators can access this feature.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 md:flex-row md:justify-between">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Auto-Close Settings
          </CardTitle>
          <CardDescription className="md:max-w-[75%]">
            Configure automatic closing of tickets in &quot;Awaiting
            Response&quot; status. Tickets will be automatically closed after
            the specified number of business days without a response from the
            requester.
          </CardDescription>
        </div>
        {/* Market Center Selector */}
        <div className="w-full sm:w-64">
          <Select
            value={selectedMarketCenterId}
            onValueChange={setSelectedMarketCenterId}
            disabled={isLoadingMarketCenters || isLoading}
          >
            <SelectTrigger role="combobox" aria-label="Select Market Center">
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
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {!isLoading && (
              <>
                <FormField
                  control={form.control}
                  name="enabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Enable Auto-Close
                        </FormLabel>
                        <FormDescription>
                          Automatically close tickets in &quot;Awaiting
                          Response&quot; status after the configured number of
                          business days.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          aria-label="Enable or disable auto-close feature"
                          disabled={
                            updateAutoClose.isPending || !selectedMarketCenterId
                          }
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="awaitingResponseDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Days Until Auto-Close</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={1}
                            max={30}
                            className="w-24"
                            {...field}
                            aria-label="Number of business days until ticket is auto-closed"
                            disabled={
                              !form.watch("enabled") ||
                              updateAutoClose.isPending ||
                              !selectedMarketCenterId
                            }
                          />
                          <span className="text-sm text-muted-foreground">
                            business days
                          </span>
                        </div>
                      </FormControl>
                      <FormDescription>
                        Tickets will be closed after this many business days
                        (excluding weekends) without a response. Default: 2
                        days.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
            {isLoading && (
              <div className="flex items-center justify-center gap-2 py-8  text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
                Loading auto-close settings...
              </div>
            )}

            {error && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Failed to load auto-close settings. Please try again later.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={
                  isLoading ||
                  updateAutoClose.isPending ||
                  !form.formState.isDirty ||
                  !selectedMarketCenterId
                }
                aria-label="Save auto-close settings"
              >
                {updateAutoClose.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
