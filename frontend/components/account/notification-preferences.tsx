"use client";

import { useMemo, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useFetchUserSettings } from "@/hooks/use-users";
import { API_BASE } from "@/lib/api/utils";
import type { NotificationPreferences } from "@/lib/types";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export default function NotificationPreferences({
  userId,
  invalidateUserQuery,
}: {
  userId?: string;
  invalidateUserQuery: Promise<void>;
}) {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  const notificationsQueryKey = ["user-account-settings", userId];
  const { data: userSettingsData, isLoading: isLoadingSettings } =
    useFetchUserSettings({
      id: userId,
      notificationsQueryKey: notificationsQueryKey,
    });

  const invalidateUserSettingsQuery = queryClient.invalidateQueries({
    queryKey: notificationsQueryKey,
  });
  const oldNotificationPreferences: NotificationPreferences[] =
    userSettingsData?.settings?.notificationPreferences ?? [];

  const [updateNotificationPreferences, setUpdateNotificationPreferences] =
    useState<NotificationPreferences[] | []>(oldNotificationPreferences);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatUpdatedPreferences = (): NotificationPreferences[] => {
    if (
      !updateNotificationPreferences ||
      !updateNotificationPreferences.length
    ) {
      return [];
    }

    if (!oldNotificationPreferences || !oldNotificationPreferences.length) {
      console.error("Nothing to update");
      return updateNotificationPreferences;
    }
    const updatedPreferences: NotificationPreferences[] = [];
    updateNotificationPreferences.forEach((newPreference) => {
      const oldPreference =
        oldNotificationPreferences &&
        oldNotificationPreferences.find(
          (oldPref: NotificationPreferences) => oldPref.id === newPreference.id
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
        newPreference.push !== oldPreference.push // || newPreference.sms !== oldPreference.sms
      ) {
        updatedPreferences.push(newPreference);
      }
    });
    return updatedPreferences;
  };

  const hasNotificationPreferenceUpdates = useMemo(() => {
    return formatUpdatedPreferences();
  }, [updateNotificationPreferences, oldNotificationPreferences]);
  console.log(
    "Has Notification Preference Updates:",
    hasNotificationPreferenceUpdates
  );

  const notificationPermissions =
    updateNotificationPreferences && updateNotificationPreferences.length > 0
      ? updateNotificationPreferences.filter(
          (p) => p.category === "PERMISSIONS"
        )
      : null;

  const notificationAccount =
    updateNotificationPreferences && updateNotificationPreferences.length > 0
      ? updateNotificationPreferences.filter((p) => p.category === "ACCOUNT")
      : null;

  const notificationActivity =
    updateNotificationPreferences && updateNotificationPreferences.length > 0
      ? updateNotificationPreferences.filter((p) => p.category === "ACTIVITY")
      : null;

  const notificationMarketing =
    updateNotificationPreferences && updateNotificationPreferences.length > 0
      ? updateNotificationPreferences.filter((p) => p.category === "MARKETING")
      : null;

  const notificationProduct =
    updateNotificationPreferences && updateNotificationPreferences.length > 0
      ? updateNotificationPreferences.filter((p) => p.category === "PRODUCT")
      : null;

  const handleSaveNotificationPreferences = async () => {
    if (!userId) {
      throw new Error("Missing user's id");
    }

    setIsSubmitting(true);

    if (
      !hasNotificationPreferenceUpdates ||
      !hasNotificationPreferenceUpdates.length
    ) {
      toast.error("Nothing to update");
      setIsSubmitting(false);
      return;
    }

    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Failed to get authentication token");
      }
      const response = await fetch(
        `${API_BASE}/users/${userId}/update/settings/notifications`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            notificationPreferences: hasNotificationPreferenceUpdates,
          }),
        }
      );

      toast.success("Preferences saved!");
    } catch (error) {
      toast.error("Error: Unable to save preferences");
      console.error("Failed to save notifications", error);
    } finally {
      await invalidateUserSettingsQuery;
      // await invalidateUserQuery;
      setIsSubmitting(false);
    }
  };

  const handleGlobalToggle = (
    channel: "email" | "push" | "inApp" | "text",
    value: boolean
  ) => {
    setUpdateNotificationPreferences((prev) =>
      prev.map((pref) =>
        pref.category === "PERMISSIONS" ? { ...pref, [channel]: value } : pref
      )
    );
  };

  function handleNotificationToggle(
    category: string,
    type: string,
    key: keyof NotificationPreferences,
    value: boolean
  ) {
    setUpdateNotificationPreferences((prev) =>
      prev.map((pref) =>
        pref.category === category && pref.type === type
          ? { ...pref, [key]: value }
          : pref
      )
    );
  }

  const formatNotificationPermissionsChannels = (
    channel: string,
    pref: NotificationPreferences
  ) => {
    const notificationPref = channel as keyof NotificationPreferences;
    let isChecked = false;
    let showOption = true;
    if (notificationPref === "email") {
      isChecked = pref.email;
      if (!notificationPermissions?.[0]?.email) {
        isChecked = false;
        showOption = false;
      }
    }
    if (notificationPref === "inApp") {
      if (!notificationPermissions?.[0]?.inApp) {
        isChecked = false;
        showOption = false;
      }
      isChecked = pref.inApp;
    }

    if (notificationPref === "push") {
      if (!notificationPermissions?.[0]?.push) {
        isChecked = false;
        showOption = false;
      }
      isChecked = pref.push;
    }

    if (notificationPref === "sms") {
      if (!notificationPermissions?.[0]?.sms) {
        isChecked = false;
        showOption = false;
      }
      isChecked = pref.sms;
    }

    return { isChecked, showOption };
  };

  const resetAllNotificationPreferences = async () => {
    const authToken = await getToken();
    if (!authToken) {
      toast.error("Failed to get authentication token");
      return;
    }

    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Failed to get authentication token");
      }
      await fetch(
        `${API_BASE}/users/${userId}/settings/notificationPreferences/reset`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            type: "reset",
          }),
        }
      );
      toast.success("Preferences reset!");
    } catch (error) {
      console.error("Failed to reset user notification preferences");
      toast.error("Error: Preferences were not reset");
    } finally {
      await invalidateUserSettingsQuery;
      // await invalidateUserQuery;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* NOTIFICATIONS */}
      <Card className="flex flex-col gap-2 justify-center">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <div className="flex flex-col gap-2">
            <CardTitle className="text-xl">Notification Settings</CardTitle>
            <CardDescription>
              Choose what you want to hear about and how you want to hear about
              it
            </CardDescription>
          </div>
          <div className="flex flex-row gap-2">
            <Button
              variant={"secondary"}
              className="w-fit"
              onClick={resetAllNotificationPreferences}
              disabled={isLoadingSettings || isSubmitting}
            >
              Reset All Preferences
            </Button>
            <Button
              // variant={"secondary"}
              className="w-fit"
              onClick={handleSaveNotificationPreferences}
              disabled={
                isLoadingSettings ||
                isSubmitting ||
                !hasNotificationPreferenceUpdates ||
                !hasNotificationPreferenceUpdates.length
              }
            >
              Save Preferences
            </Button>
          </div>
        </CardHeader>
        {/*  mx-20 sm:max-w-lg lg:max-w-2xl */}
        <Separator className="mt-5 max-w-11/12 self-center" />
        <CardContent className="space-y-2">
          {/* APP PERMISSIONS */}
          <div className="space-y-1 w-full my-4">
            <p className="text-lg font-bold ">Conductor Permissions</p>
            <p className="text-sm text-muted-foreground">
              Conductor will always email you updates and alerts concerning your
              account
            </p>
          </div>
          {["inApp", "push", "email", "sms"].map((channel) => {
            const notificationPref = channel as keyof NotificationPreferences;
            let isChecked = false;
            if (notificationPref === "email")
              isChecked = notificationPermissions?.[0]?.email || false;
            if (notificationPref === "inApp")
              isChecked = notificationPermissions?.[0]?.inApp || false;
            if (notificationPref === "push")
              isChecked = notificationPermissions?.[0]?.push || false;
            if (notificationPref === "sms")
              isChecked = notificationPermissions?.[0]?.sms || false;
            return (
              <div
                key={`permissions-${channel}-${notificationPermissions?.[0]?.id}`}
                className="flex items-center justify-between px-1 sm:px-4"
              >
                <Label
                  className={`text-sm capitalize ${
                    !isChecked && "text-muted-foreground"
                  }`}
                >
                  {channel} Allowed
                </Label>
                <Switch
                  checked={isChecked}
                  onCheckedChange={(checked) =>
                    handleGlobalToggle(
                      channel as "email" | "push" | "inApp" | "text",
                      checked
                    )
                  }
                  disabled={notificationPref === "sms"}
                />
              </div>
            );
          })}
        </CardContent>
      </Card>
      <div className="space-y-6 md:grid md:grid-cols-3 md:gap-6">
        {/* ACCOUNT, MARKETING, PRODUCT */}
        <div className="md:col-span-1 space-y-6">
          {/* ACCOUNT */}
          <Card className="flex flex-col gap-2 h-fit">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div className="flex flex-col gap-2">
                <CardTitle className="text-lg">Account Alerts</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {notificationAccount &&
                notificationAccount.map((pref) => {
                  return (
                    <Accordion key={pref.type} type="single" collapsible>
                      <AccordionItem value={pref.type}>
                        <AccordionTrigger>
                          <Label className="font-semibold capitalize">
                            {pref.type}
                          </Label>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-2">
                          {["inApp", "push", "email", "sms"].map((channel) => {
                            const { isChecked, showOption } =
                              formatNotificationPermissionsChannels(
                                channel,
                                pref
                              );
                            if (!showOption) return null;
                            return (
                              <div
                                key={`account-${channel}-${pref.id}`}
                                //
                                className="flex items-center justify-between  px-1 sm:px-2"
                              >
                                <p className={`text-sm capitalize`}>
                                  {channel}
                                </p>
                                <Switch
                                  checked={isChecked}
                                  onCheckedChange={(checked) =>
                                    handleNotificationToggle(
                                      pref.category,
                                      pref.type,
                                      channel as keyof NotificationPreferences,
                                      checked
                                    )
                                  }
                                  disabled
                                />
                              </div>
                            );
                          })}
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  );
                })}
            </CardContent>
          </Card>
          {/* MARKETING */}
          <Card className="flex flex-col gap-2 h-fit">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div className="flex flex-col gap-2">
                <CardTitle className="text-lg">Marketing</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {notificationMarketing &&
                notificationMarketing.map((pref) => {
                  return (
                    <Accordion
                      key={`${pref.type}-${pref.id}`}
                      type="single"
                      collapsible
                    >
                      <AccordionItem value={pref.type}>
                        <AccordionTrigger>
                          <Label className="font-semibold capitalize">
                            {pref.type}
                          </Label>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-2">
                          {["inApp", "push", "email", "sms"].map((channel) => {
                            const { isChecked, showOption } =
                              formatNotificationPermissionsChannels(
                                channel,
                                pref
                              );
                            if (!showOption) return null;
                            return (
                              <div
                                key={`account-${channel}-${pref.id}`}
                                //
                                className="flex items-center justify-between  px-1 sm:px-2"
                              >
                                <p className={`text-sm capitalize`}>
                                  {channel}
                                </p>
                                <Switch
                                  checked={isChecked}
                                  onCheckedChange={(checked) =>
                                    handleNotificationToggle(
                                      pref.category,
                                      pref.type,
                                      channel as keyof NotificationPreferences,
                                      checked
                                    )
                                  }
                                />
                              </div>
                            );
                          })}
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  );
                })}
            </CardContent>
          </Card>
          {/* PRODUCT */}
          <Card className="flex flex-col gap-2 h-fit">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div className="flex flex-col gap-2">
                <CardTitle className="text-lg">Product Updates</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {notificationProduct &&
                notificationProduct.map((pref) => {
                  return (
                    <Accordion
                      key={`${pref.type}-${pref.id}`}
                      type="single"
                      collapsible
                    >
                      <AccordionItem value={pref.type}>
                        <AccordionTrigger>
                          <Label className="font-semibold capitalize">
                            {pref.type}
                          </Label>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-2">
                          {["inApp", "push", "email", "sms"].map((channel) => {
                            const { isChecked, showOption } =
                              formatNotificationPermissionsChannels(
                                channel,
                                pref
                              );
                            if (!showOption) return null;
                            return (
                              <div
                                key={`account-${channel}-${pref.id}`}
                                //
                                className="flex items-center justify-between  px-1 sm:px-2"
                              >
                                <p className={`text-sm capitalize`}>
                                  {channel}
                                </p>
                                <Switch
                                  checked={isChecked}
                                  onCheckedChange={(checked) =>
                                    handleNotificationToggle(
                                      pref.category,
                                      pref.type,
                                      channel as keyof NotificationPreferences,
                                      checked
                                    )
                                  }
                                />
                              </div>
                            );
                          })}
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  );
                })}
            </CardContent>
          </Card>
        </div>
        {/* ACTIVITY - TICKETS AND COMMENTS */}
        <div className="md:col-span-2 space-y-6">
          {/* TICKET */}
          <Card className="flex flex-col gap-2 h-fit">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div className="flex flex-col gap-2">
                <CardTitle className="text-lg">App Activity</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {notificationActivity &&
                notificationActivity.map((pref) => {
                  // const label = pref.type.split(" ").slice(1).join(" ");
                  return (
                    <Accordion key={pref.type} type="single" collapsible>
                      <AccordionItem value={pref.type}>
                        <AccordionTrigger>
                          <Label className="font-semibold capitalize">
                            {pref.type}
                          </Label>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-2">
                          {["inApp", "push", "email", "sms"].map((channel) => {
                            const { isChecked, showOption } =
                              formatNotificationPermissionsChannels(
                                channel,
                                pref
                              );
                            if (!showOption) return null;
                            return (
                              <div
                                key={`account-${channel}-${pref.id}`}
                                //
                                className="flex items-center justify-between  px-1 sm:px-2"
                              >
                                <p className={`text-sm capitalize`}>
                                  {channel}
                                </p>
                                <Switch
                                  checked={isChecked}
                                  onCheckedChange={(checked) =>
                                    handleNotificationToggle(
                                      pref.category,
                                      pref.type,
                                      channel as keyof NotificationPreferences,
                                      checked
                                    )
                                  }
                                />
                              </div>
                            );
                          })}
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  );
                })}
            </CardContent>
          </Card>

          {/* MARKET CENTER */}
          {/* <Card className="flex flex-col gap-2 h-fit">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div className="flex flex-col gap-2">
                <CardTitle className="text-lg">
                  Market Center Activity
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {marketCenterActivity &&
                marketCenterActivity.map((pref) => {
                  const label = pref.type.split(" ").slice(2).join(" ");
                  return (
                    <Accordion key={pref.type} type="single" collapsible>
                      <AccordionItem value={pref.type}>
                        <AccordionTrigger>
                          <Label className="font-semibold capitalize">
                            {label}
                          </Label>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-2">
                          {["inApp", "push", "email", "sms"].map((channel) => {
                            const { isChecked, showOption } =
                              formatNotificationPermissionsChannels(
                                channel,
                                pref
                              );
                            if (!showOption) return null;
                            return (
                              <div
                                key={`account-${channel}-${pref.id}`}
                                //
                                className="flex items-center justify-between  px-1 sm:px-2"
                              >
                                <p className={`text-sm capitalize`}>
                                  {channel}
                                </p>
                                <Switch
                                  checked={isChecked}
                                  onCheckedChange={(checked) =>
                                    handleNotificationToggle(
                                      pref.category,
                                      pref.type,
                                      channel as keyof NotificationPreferences,
                                      checked
                                    )
                                  }
                                />
                              </div>
                            );
                          })}
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  );
                })}
            </CardContent>
          </Card> */}
        </div>
      </div>
    </div>
  );
}

// {/* Select All */}
//         {/* <div className="flex items-center gap-4">
//           <p className="font-medium">Select All</p>
//           <Switch
//             checked={
//               pref.email && pref.inApp && pref.push && pref.sms
//             }
//             onCheckedChange={(checked) => {
//               handleNotificationToggle(
//                 pref.category,
//                 pref.type,
//                 "email",
//                 checked
//               );
//               handleNotificationToggle(
//                 pref.category,
//                 pref.type,
//                 "inApp",
//                 checked
//               );
//               handleNotificationToggle(
//                 pref.category,
//                 pref.type,
//                 "push",
//                 checked
//               );
//               handleNotificationToggle(
//                 pref.category,
//                 pref.type,
//                 "sms",
//                 checked
//               );
//             }}
//           />
//         </div> */}
