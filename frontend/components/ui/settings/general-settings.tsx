"use client";

import { useState } from "react";
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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Clock, Palette, Globe, AlertTriangle } from "lucide-react";
import {
  // useMarketCenterSettings,
  useUpdateMarketCenterSettings,
} from "@/hooks/use-settings";
import { toast } from "sonner";
// import { DAYS, LANGUAGES, TIMEZONES } from "@/lib/utils";
import { useFetchMarketCenter } from "@/hooks/use-market-center";
import { useQueryClient } from "@tanstack/react-query";
import { useStore } from "@/app/store-provider";
import { useUserRole } from "@/hooks/use-user-role";


export default function GeneralSettings() {
  const queryClient = useQueryClient();

  const { currentUser } = useStore();
  const { role, permissions } = useUserRole();

  const marketCenterId = currentUser?.marketCenterId
    ? currentUser?.marketCenterId
    : "";
  const { data: marketCenter, isLoading } = useFetchMarketCenter(
    role,
    marketCenterId
  );
  const settings = marketCenter?.settings ?? {};

  console.log("MARKET CENTER", marketCenter);

  const updateSettings = useUpdateMarketCenterSettings();

  // const form = useForm<GeneralSettingsForm>({
  //   resolver: zodResolver(generalSettingsSchema),
  //   defaultValues: settings,
  // });

  // Update form when settings data loads
  // if (settings && !form.formState.isDirty) {
  //   form.reset(settings);
  // }

  // const onSubmit = async (data: GeneralSettingsForm) => {
  //   try {
  //     await updateSettings.mutateAsync({
  //       settings: data,
  //     });
  //     toast.success("Settings updated successfully");
  //   } catch (error) {
  //     toast.error("Failed to update settings");
  //   }
  // };

  return (
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

        {/* Branding */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Branding
            </CardTitle>
            <CardDescription>
              Customize your market center's appearance and branding
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* <FormField
              control={form.control}
              name="branding.companyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter Market Center name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            /> */}
          </CardContent>
        </Card>

        {/* General Settings */}
        {/* <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              General Settings
            </CardTitle>
            <CardDescription>
              Configure general application settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="general.timezone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Timezone</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select timezone" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="general.language"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Language</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {LANGUAGES.map((lang) => (
                        <SelectItem key={lang.value} value={lang.value}>
                          {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="general.autoAssignment"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between space-y-0 rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Auto Assignment</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Automatically assign tickets to team members based on
                      category
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card> */}

        {/* Holidays */}
        {/* <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Holiday Calendar
            </CardTitle>
            <CardDescription>
              Manage your company's holiday schedule
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={holidayInput}
                onChange={(e) => setHolidayInput(e.target.value)}
                placeholder="Enter holiday date (YYYY-MM-DD)"
                type="date"
              />
              <Button type="button" onClick={addHoliday}>
                Add Holiday
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {form.watch("holidays")?.map((holiday, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="flex items-center gap-1"
                >
                  {holiday}
                  <button
                    type="button"
                    onClick={() => removeHoliday(index)}
                    className="ml-1 hover:text-destructive"
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card> */}

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={updateSettings.isPending}
            className="w-32"
          >
            {updateSettings.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
