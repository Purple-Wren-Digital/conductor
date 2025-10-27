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
import { useStore } from "@/context/store-provider";
import { useUserRole } from "@/hooks/use-user-role";
import { useUser } from "@clerk/nextjs";


export default function GeneralSettings() {
  const queryClient = useQueryClient();
  const { user: clerkUser } = useUser();

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

  const updateSettings = useUpdateMarketCenterSettings(clerkUser?.id);

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
    <div className="space-y-6">
      {/* Branding */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Branding
          </CardTitle>
          <CardDescription>
            Customize your market center&apos;s appearance and branding
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Branding settings coming soon.
          </p>
        </CardContent>
      </Card>

      {/* General Settings */}
      <Card>
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
          <p className="text-sm text-muted-foreground">
            General settings configuration coming soon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
