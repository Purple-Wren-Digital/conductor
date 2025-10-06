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
  useMarketCenterSettings,
  useUpdateMarketCenterSettings,
} from "@/hooks/use-settings";
import { toast } from "sonner";
import { DAYS, LANGUAGES, TIMEZONES } from "@/lib/utils";

const businessHoursSchema = z.object({
  monday: z.object({ start: z.string(), end: z.string(), isOpen: z.boolean() }),
  tuesday: z.object({
    start: z.string(),
    end: z.string(),
    isOpen: z.boolean(),
  }),
  wednesday: z.object({
    start: z.string(),
    end: z.string(),
    isOpen: z.boolean(),
  }),
  thursday: z.object({
    start: z.string(),
    end: z.string(),
    isOpen: z.boolean(),
  }),
  friday: z.object({ start: z.string(), end: z.string(), isOpen: z.boolean() }),
  saturday: z.object({
    start: z.string(),
    end: z.string(),
    isOpen: z.boolean(),
  }),
  sunday: z.object({ start: z.string(), end: z.string(), isOpen: z.boolean() }),
});

const generalSettingsSchema = z.object({
  businessHours: businessHoursSchema,
  branding: z.object({
    primaryColor: z
      .string()
      .regex(/^#[0-9A-F]{6}$/i, "Must be a valid hex color"),
    logoUrl: z.string().url().optional().or(z.literal("")),
    companyName: z.string().optional(),
  }),
  general: z.object({
    timezone: z.string(),
    language: z.string(),
    autoAssignment: z.boolean(),
  }),
  holidays: z.array(z.string()),
});

type GeneralSettingsForm = z.infer<typeof generalSettingsSchema>;

export default function GeneralSettings() {
  const { data: settings, isLoading } = useMarketCenterSettings();



  
  const updateSettings = useUpdateMarketCenterSettings();
  const [holidayInput, setHolidayInput] = useState("");

  const form = useForm<GeneralSettingsForm>({
    resolver: zodResolver(generalSettingsSchema),
    defaultValues: settings,
  });

  // Update form when settings data loads
  if (settings && !form.formState.isDirty) {
    form.reset(settings);
  }

  const onSubmit = async (data: GeneralSettingsForm) => {
    try {
      await updateSettings.mutateAsync({
        settings: data,
      });
      toast.success("Settings updated successfully");
    } catch (error) {
      toast.error("Failed to update settings");
    }
  };

  const addHoliday = () => {
    if (!holidayInput.trim()) return;

    const currentHolidays = form.getValues("holidays") || [];
    const newHolidays = [...currentHolidays, holidayInput.trim()];
    form.setValue("holidays", newHolidays);
    setHolidayInput("");
  };

  const removeHoliday = (index: number) => {
    const currentHolidays = form.getValues("holidays") || [];
    const newHolidays = currentHolidays.filter((_, i) => i !== index);
    form.setValue("holidays", newHolidays);
  };

  // if (isLoading) {
  //   return (
  //     <Card>
  //       <CardHeader>
  //         <CardTitle>General Settings</CardTitle>
  //       </CardHeader>
  //       <CardContent>
  //       </CardContent>
  //     </Card>
  //   );
  // }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Business Hours */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Business Hours
            </CardTitle>
            <CardDescription>
              Set your business hours for each day of the week
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            
            {DAYS.map(({ key, label }) => (
              <div key={key} className="flex items-center gap-4">
                <div className="w-20">
                  <Label className="text-sm font-medium">{label}</Label>
                </div>
                <FormField
                  control={form.control}
                  name={`businessHours.${key}.isOpen`}
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                {form.watch(`businessHours.${key}.isOpen`) && (
                  <div className="flex items-center gap-2">
                    <FormField
                      control={form.control}
                      name={`businessHours.${key}.start`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input type="time" {...field} className="w-28" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <span className="text-muted-foreground">to</span>
                    <FormField
                      control={form.control}
                      name={`businessHours.${key}.end`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input type="time" {...field} className="w-28" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                )}
                {!form.watch(`businessHours.${key}.isOpen`) && (
                  <span className="text-muted-foreground">Closed</span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Branding */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Branding
            </CardTitle>
            <CardDescription>
              Customize your market center's appearance and branding
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="branding.companyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter company name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="branding.primaryColor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Primary Color</FormLabel>
                  <div className="flex items-center gap-2">
                    <FormControl>
                      <Input type="color" {...field} className="w-16 h-10" />
                    </FormControl>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="#2563eb"
                        className="font-mono"
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="branding.logoUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Logo URL</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="https://example.com/logo.png"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
        </Card>

        {/* Holidays */}
        <Card>
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
        </Card>

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
