"use client";

import { useCallback, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useFetchMarketCenterNotificationPreferences } from "@/hooks/use-market-center";
import { API_BASE } from "@/lib/api/utils";
import type { NotificationPreferences } from "@/lib/types";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function MarketCenterNotificationPreferences({
  marketCenterId,
}: {
  marketCenterId?: string;
}) {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  const notificationsQueryKey = useMemo(
    () => ["market-center-settings-notification-preferences", marketCenterId],
    [marketCenterId]
  );
  const invalidateMarketCenterNotificationPreferencesQuery =
    useCallback(async () => {
      await queryClient.invalidateQueries({
        queryKey: notificationsQueryKey,
      });
    }, [queryClient, notificationsQueryKey]);

  const { data: marketCenterSettingsData, isLoading: isLoadingSettings } =
    useFetchMarketCenterNotificationPreferences({
      id: marketCenterId,
      notificationsQueryKey: notificationsQueryKey,
    });

  const marketCenterNotificationPreferences: NotificationPreferences[] =
    useMemo(() => {
      if (
        marketCenterSettingsData &&
        marketCenterSettingsData?.notificationPreferences &&
        marketCenterSettingsData?.notificationPreferences.length > 0
      ) {
        return marketCenterSettingsData.notificationPreferences;
      }
      return [] as NotificationPreferences[];
    }, [marketCenterSettingsData]);

  const [updatedNotificationPreferences, setUpdatedNotificationPreferences] =
    useState<NotificationPreferences[]>(marketCenterNotificationPreferences);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleNotificationToggle(
    category: string,
    type: string,
    key: keyof NotificationPreferences,
    value: boolean
  ) {
    setUpdatedNotificationPreferences((prev) =>
      prev.map((pref) =>
        pref?.category === category && pref?.type === type
          ? { ...pref, [key]: value }
          : pref
      )
    );
  }

  const validatedUpdatedPreferences = useCallback(() => {
    if (
      !updatedNotificationPreferences ||
      !updatedNotificationPreferences.length
    ) {
      return [];
    }

    if (
      !marketCenterNotificationPreferences ||
      !marketCenterNotificationPreferences.length
    ) {
      return updatedNotificationPreferences;
    }

    const updatedPreferences: NotificationPreferences[] = [];
    updatedNotificationPreferences.forEach((newPreference) => {
      const oldPreference =
        marketCenterNotificationPreferences &&
        marketCenterNotificationPreferences.find(
          (oldPref: NotificationPreferences) =>
            oldPref?.category === newPreference?.category &&
            oldPref?.type === newPreference?.type
        );
      if (!oldPreference) {
        updatedPreferences.push(newPreference);
        return;
      }

      if (
        (oldPreference &&
          oldPreference?.email &&
          oldPreference?.inApp &&
          oldPreference?.push &&
          newPreference.email !== oldPreference.email) ||
        newPreference.inApp !== oldPreference.inApp ||
        newPreference.push !== oldPreference.push
      ) {
        updatedPreferences.push(newPreference);
      }
    });
    return updatedPreferences;
  }, [updatedNotificationPreferences, marketCenterNotificationPreferences]);

  const hasNotificationPreferenceUpdates: NotificationPreferences[] =
    useMemo(() => {
      const updatedPreferences = validatedUpdatedPreferences();
      return updatedPreferences;
    }, [validatedUpdatedPreferences]);

  const updatePreferenceMutation = useMutation<
    {},
    Error,
    { marketCenterId: string }
  >({
    mutationFn: async () => {
      if (!marketCenterId) {
        throw new Error("Missing market center id");
      }
      setIsSubmitting(true);

      const token = await getToken();
      if (!token) {
        throw new Error("Failed to get authentication token");
      }
      const response = await fetch(
        `${API_BASE}/settings/market-center/${marketCenterId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
          body: JSON.stringify({
            updatedPreferences: updatedNotificationPreferences,
          }),
        }
      );
      if (!response.ok) {
        throw new Error("Failed to update notification preferences");
      }
      return {};
    },
    onSuccess: async () => {
      await invalidateMarketCenterNotificationPreferencesQuery();
      toast.success("Notifications preferences saved!");
    },
    onError: (error) => {
      toast.error("Error: Unable to save preferences");
      console.error("Failed to save notifications", error);
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  const handleSaveMCNotificationPreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!marketCenterId) {
      throw new Error("Missing market center id");
    }

    if (
      !hasNotificationPreferenceUpdates ||
      !hasNotificationPreferenceUpdates.length
    ) {
      toast.error("Nothing to update");
      setIsSubmitting(false);
      return;
    }
    updatePreferenceMutation.mutate({ marketCenterId: marketCenterId });
  };

  const resetAllNotificationPreferences = (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatedNotificationPreferences(marketCenterNotificationPreferences);
  };

  return (
    <form
      onSubmit={handleSaveMCNotificationPreferences}
      onReset={resetAllNotificationPreferences}
      className="flex flex-col gap-2 justify-center space-y-6"
    >
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <div className="flex flex-col gap-2">
          <CardTitle className="text-xl">Notification Settings</CardTitle>
          <CardDescription>
            Enable or disable app activity notifications for your market center
          </CardDescription>
        </div>
        <div className="flex flex-row gap-2">
          {hasNotificationPreferenceUpdates &&
            hasNotificationPreferenceUpdates.length > 0 && (
              <Button
                type="reset"
                variant={"secondary"}
                className="w-fit"
                disabled={isLoadingSettings || isSubmitting}
              >
                <RotateCcw className="size-3.5" />
                Reset Changes
              </Button>
            )}
          <Button
            type="submit"
            className="w-fit"
            disabled={
              isLoadingSettings ||
              isSubmitting ||
              !hasNotificationPreferenceUpdates ||
              !hasNotificationPreferenceUpdates.length
            }
          >
            {isSubmitting
              ? "Saving Preferences..."
              : isLoadingSettings
                ? "Loading..."
                : "Save Preferences"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {updatedNotificationPreferences &&
          updatedNotificationPreferences.map((preference) => {
            return (
              <Card key={preference?.type ? preference.type : Math.random()}>
                <CardContent className="space-y-2">
                  <Label className="font-semibold capitalize border-b pb-2">
                    {preference?.type
                      ? preference.type.replaceAll("_", " ")
                      : "Unknown"}
                  </Label>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-1 sm:px-2 ">
                      <p className={`text-sm`}>
                        {preference?.inApp === false &&
                        preference?.email === false
                          ? "Disabled"
                          : "Disable All"}
                      </p>
                      <Switch
                        checked={
                          preference?.inApp === false &&
                          preference?.email === false
                            ? true
                            : false
                        }
                        onCheckedChange={(checked) => {
                          setUpdatedNotificationPreferences(
                            (prev: NotificationPreferences[]) =>
                              prev.map((pref: NotificationPreferences) =>
                                preference?.type === pref?.type
                                  ? {
                                      ...pref,
                                      inApp: checked ? false : true,
                                      email: checked ? false : true,
                                    }
                                  : pref
                              )
                          );
                        }}
                      />
                    </div>
                    {["inApp", "email"].map((channel) => {
                      const isChecked =
                        channel === "email"
                          ? (preference?.email as boolean)
                          : (preference?.inApp as boolean);

                      if (
                        preference?.inApp === false &&
                        preference?.email === false
                      ) {
                        return null;
                      }

                      return (
                        <div
                          key={`account-${channel}-${preference.type}`}
                          className="flex items-center justify-between px-1 sm:px-2"
                        >
                          <p className={`text-sm capitalize`}>{channel}</p>
                          <Switch
                            checked={isChecked}
                            onCheckedChange={(checked) => {
                              handleNotificationToggle(
                                preference.category,
                                preference.type,
                                channel as keyof NotificationPreferences,
                                checked
                              );
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
      </CardContent>
    </form>
  );
}
