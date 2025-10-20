"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { NotificationPreferences, PrismaUser, UserSettings } from "@/lib/types";
import { useState } from "react";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { toast } from "sonner";
import { API_BASE } from "@/lib/api/utils";

export default function Notifications({
  user,
  getAuth0AccessToken,
  invalidateUserQuery,
}: {
  user: PrismaUser;
  getAuth0AccessToken: () => Promise<string>;
  invalidateUserQuery: Promise<void>;
}) {
  const oldNotificationPreferences =
    user &&
    user?.userSettings &&
    user?.userSettings?.notificationPreferences &&
    user?.userSettings?.notificationPreferences.length > 0
      ? user.userSettings.notificationPreferences
      : [];

  const [updateNotificationPreferences, setUpdateNotificationPreferences] =
    useState<NotificationPreferences[] | []>(oldNotificationPreferences);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const formatUpdatedPreferences = (): NotificationPreferences[] => {
    if (
      !updateNotificationPreferences ||
      !updateNotificationPreferences.length
    ) {
      return [];
    }

    if (!oldNotificationPreferences || !oldNotificationPreferences.length) {
      console.log("Nothing to update");
      return updateNotificationPreferences;
    }
    const updatedPreferences: NotificationPreferences[] = [];
    updateNotificationPreferences.forEach((newPreference) => {
      const oldPreference = oldNotificationPreferences.find(
        (oldPref) => oldPref.id === newPreference.id
      );
      if (!oldPreference) {
        updatedPreferences.push(newPreference);
        return;
      }

      if (
        newPreference.email !== oldPreference.email ||
        newPreference.inApp !== oldPreference.inApp ||
        newPreference.push !== oldPreference.push // || newPreference.sms !== oldPreference.sms
      ) {
        updatedPreferences.push(newPreference);
      }
    });
    return updatedPreferences;
  };

  const handleSaveNotificationPreferences = async () => {
    if (!user || !user?.id) {
      // || !userId) {
      throw new Error("Missing user id");
    }
    setIsSubmitting(true);
    const notificationPreferenceUpdates = formatUpdatedPreferences();

    if (
      !notificationPreferenceUpdates ||
      !notificationPreferenceUpdates.length
    ) {
      toast.error("Nothing to update");
      setIsSubmitting(false);
      return;
      // throw new Error("Nothing to update");
    }

    try {
      const accessToken = await getAuth0AccessToken();
      const response = await fetch(
        `${API_BASE}/users/${user.id}/update/settings/notifications`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            notificationPreferences: notificationPreferenceUpdates,
          }),
        }
      );

      console.log("response", response);
      const data = await response.json();
      toast.success("Preferences saved!");

      console.log("data", data);
    } catch (error) {
      toast.error("Error: Unable to save preferences");
      console.error("Failed to save notifications", error);
    } finally {
      setIsSubmitting(false);
      await invalidateUserQuery;
    }
  };

  const handleGlobalToggle = (
    channel: "email" | "push" | "inApp" | "text",
    value: boolean
  ) => {
    setUpdateNotificationPreferences((prev) =>
      prev.map((pref) => ({
        ...pref,
        [channel]: value,
      }))
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

  return (
    <div className="space-y-6 lg:grid lg:grid-cols-3 lg:gap-6">
      {/* NOTIFICATIONS */}
      <div className="lg:col-span-3">
        <Card className="flex flex-col gap-2">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div className="flex flex-col gap-2">
              <CardTitle className="text-lg">Notification Settings</CardTitle>
              <CardDescription>
                Choose what you want to hear about and how you want to hear
                about it
              </CardDescription>
            </div>
            <Button
              // variant={"secondary"}
              className="w-full sm:w-fit"
              onClick={handleSaveNotificationPreferences}
              disabled={isSubmitting}
            >
              Save Preferences
            </Button>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* APP PERMISSIONS */}
            <div className="space-y-1 w-full my-4">
              <p className="text-lg font-bold ">Conductor Permissions</p>
              <p className="text-sm text-muted-foreground">
                Conductor will always email you updates and alerts concerning
                your account
              </p>
            </div>
            {notificationPermissions &&
              notificationPermissions.map((pref) => (
                <div key={`${pref.type}-${pref.id}`} className="space-y-2">
                  <div className="space-y-2 px-4">
                    {["inApp", "push", "email", "sms"].map((channel) => {
                      const notificationPref =
                        channel as keyof NotificationPreferences;
                      let isChecked = true;
                      if (notificationPref === "email") isChecked = pref.email;
                      if (notificationPref === "inApp") isChecked = pref.inApp;
                      if (notificationPref === "push") isChecked = pref.push;
                      if (notificationPref === "sms") isChecked = false; //pref.sms;
                      return (
                        <div
                          key={`permissions-${channel}-${pref.id}`}
                          className="flex items-center justify-between"
                        >
                          <Label
                            className={`text-sm capitalize ${notificationPref === "sms" && "text-muted-foreground"}`}
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
                  </div>
                </div>
              ))}
            {/* ACCOUNT */}
            <p className="text-lg font-bold pb-1 w-full border-b my-4">
              Account Notifications
            </p>
            {notificationAccount &&
              notificationAccount.map((pref) => (
                <div key={pref.type} className="space-y-2">
                  <Label className="font-semibold capitalize">
                    {pref.type === "new_comment" ? "New Comments" : pref.type}
                  </Label>

                  <div className="space-y-2 px-4">
                    {["inApp", "push", "email", "sms"].map((channel) => {
                      const notificationPref =
                        channel as keyof NotificationPreferences;
                      let isChecked = true;
                      if (notificationPref === "email") isChecked = pref.email;
                      if (notificationPref === "inApp") isChecked = pref.inApp;
                      if (notificationPref === "push") isChecked = pref.push;
                      if (notificationPref === "sms") {
                        isChecked = false; //pref.sms;
                        return null;
                      }
                      return (
                        <div
                          key={`permissions-${channel}-${pref.id}`}
                          className="flex items-center justify-between"
                        >
                          <Label
                            className={`text-sm capitalize`} // ${notificationPref === "sms" && "text-muted-foreground"}`}
                          >
                            {channel}
                          </Label>
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
                            // disabled={notificationPref === "sms"}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            {/* ACTIVITY */}
            <p className="text-lg font-bold pb-1 w-full border-b my-4">
              App Activity Notifications
            </p>
            {notificationActivity &&
              notificationActivity.map((pref) => (
                <div key={pref.type} className="space-y-2">
                  <Label className="text-md font-semibold capitalize">
                    {pref.type === "new_comment" ? "New Comments" : pref.type}
                  </Label>
                  <div className="space-y-2 px-4">
                    {["inApp", "push", "email", "sms"].map((prefType) => {
                      const notificationPref =
                        prefType as keyof NotificationPreferences;
                      let isChecked = true;
                      if (notificationPref === "email") isChecked = pref.email;
                      if (notificationPref === "inApp") isChecked = pref.inApp;
                      if (notificationPref === "push") isChecked = pref.push;
                      if (notificationPref === "sms") {
                        isChecked = false; //pref.sms;
                        return null;
                      }
                      return (
                        <div
                          key={prefType}
                          className="flex items-center justify-between"
                        >
                          <p className="text-sm capitalize">{prefType}</p>
                          <Switch
                            checked={isChecked}
                            onCheckedChange={(checked) =>
                              handleNotificationToggle(
                                pref.category,
                                pref.type,
                                prefType as keyof NotificationPreferences,
                                checked
                              )
                            }
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// {/* <Accordion type="single" collapsible>
//     <AccordionItem value={"comment-notifications"}>
//       <AccordionHeader>
//         <AccordionTrigger>New Comments</AccordionTrigger>
//       </AccordionHeader>
//       <AccordionContent className="space-y-2 px-4">
//         <div className="flex items-center justify-between">
//           <p>Email</p>
//           <Switch id="emailNotifications" defaultChecked />
//         </div>
//         <div className="flex items-center justify-between">
//           <p>In-App</p>
//           <Switch id="inAppNotifications" defaultChecked />
//         </div>
//         <div className="flex items-center justify-between">
//           <p>Push/Browser</p>
//           <Switch id="pushNotifications" disabled />
//         </div>
//         <div className="flex items-center justify-between">
//           <p className="font-semibold">Email</p>
//           <Switch id="emailNotifications" defaultChecked />
//         </div>
//       </AccordionContent>
//     </AccordionItem>
//   </Accordion> */}

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
