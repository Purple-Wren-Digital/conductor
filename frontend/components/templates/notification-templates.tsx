"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import NotificationEditor from "@/components/ui/TextArea/NotificationEditor";
import { ToolTip } from "@/components/ui/tooltip/tooltip";
import { API_BASE } from "@/lib/api/utils";
import type { NotificationTemplateFormData } from "@/lib/types";
import { RotateCcw, Save, X } from "lucide-react";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";

const defaultFormData: NotificationTemplateFormData = {
  subject: "",
  body: "",
  marketCenters: [
    {
      id: "",
      name: "",
      templateId: "",
      isActive: true,
    },
  ],
};

interface NotificationTemplatesByMarketCenter {
  templateName: string;
  templateDescription: string;
  type: string;
  subject: string;
  body: string;
  variables?: any;
  marketCenters: {
    id: string;
    name: string;
    templateId: string;
    isActive: boolean;
  }[];
}

export default function NotificationTemplates({
  notificationTemplates,
  isLoading,
  refreshTemplates,
}: {
  notificationTemplates: NotificationTemplatesByMarketCenter[];
  isLoading: boolean;
  refreshTemplates: () => Promise<void>;
}) {
  const [editingTemplates, setEditingTemplates] =
    useState<NotificationTemplatesByMarketCenter | null>(null);
  const [formData, setFormData] =
    useState<NotificationTemplateFormData>(defaultFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { getToken } = useAuth();

  function getTemplateVariables(obj: any) {
    let formattedVariables: any[] = [];
    if (!obj) return formattedVariables;
    Object.entries(obj).forEach(([key, value]) => {
      formattedVariables.push(value);
    });
    return formattedVariables;
  }

  const templateVariables =
    editingTemplates && editingTemplates?.variables
      ? getTemplateVariables(editingTemplates.variables)
      : [];

  const handleStartEditingTemplate = (
    template: NotificationTemplatesByMarketCenter
  ) => {
    setEditingTemplates(template);

    setFormData({
      subject: template.subject ?? "",
      body: template.body ?? "",
      marketCenters: template.marketCenters.map((mc) => ({
        id: mc.id,
        name: mc.name,
        templateId: mc.templateId,
        isActive: mc.isActive,
      })),
    });
  };

  const editTemplateMutation = useMutation({
    mutationFn: async ({
      templateId,
      isActive,
    }: {
      templateId: string;
      isActive?: boolean;
    }) => {
      setIsSubmitting(true);

      if (
        !formData ||
        !formData?.marketCenters ||
        !formData?.marketCenters.length
      ) {
        throw new Error("No market centers or template ids found");
      }

      const token = await getToken();
      if (!token) throw new Error("Failed to get authentication token");

      const response = await fetch(
        `${API_BASE}/notifications/templates/update`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            templateId: templateId,
            subject: formData.subject,
            body: formData.body,
            isActive: isActive,
          }),
        }
      );

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Failed to update template: ${text}`);
      }
    },
    onSuccess: () => {
      toast.success(`Template updated successfully`);
    },
    onError: (error) => {
      console.error("Error updating template:", error);
      toast.error("Failed to update template");
    },
    onSettled: async () => {
      await refreshTemplates();
      setIsSubmitting(false);
    },
  });

  const handleUpdateTemplates = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData || !formData?.subject.trim() || !formData?.body.trim()) {
      toast.error("Subject and Body cannot be empty");
      return;
    }

    for (const marketCenter of formData.marketCenters) {
      editTemplateMutation.mutateAsync({
        templateId: marketCenter.templateId,
        isActive: marketCenter.isActive,
      });
    }
  };

  const resetTemplatesMutation = useMutation({
    mutationFn: async (templateId: string) => {
      setIsSubmitting(true);

      if (!templateId) {
        throw new Error("Missing template Id");
      }

      if (
        !formData ||
        !formData?.marketCenters ||
        !formData?.marketCenters.length
      ) {
        throw new Error("No market centers or template ids found");
      }

      const token = await getToken();
      if (!token) throw new Error("Failed to get authentication token");
      const response = await fetch(
        `${API_BASE}/notifications/templates/reset/${templateId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Failed to update template: ${text}`);
      }
    },
    onSuccess: () => {
      toast.success(`Reset successfully`);
    },
    onError: (error) => {
      toast.error("Failed to update template");
      console.error("Error resetting template:", error);
    },
    onSettled: async () => {
      await refreshTemplates();
      setIsSubmitting(false);
    },
  });

  const handleResetTemplateToDefault = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData ||
      !formData?.marketCenters ||
      !formData?.marketCenters.length
    ) {
      toast.error("Error resetting template");
      console.error(
        "handleResetTemplateToDefault() - No market centers or template ids found"
      );
      return;
    }
    for (const marketCenter of formData.marketCenters) {
      await resetTemplatesMutation.mutateAsync(marketCenter?.templateId);
    }
  };

  return (
    <div className="space-y-6">
      {/* FILTERS */}
      {isLoading && (
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h3 className="font-semibold text-muted-foreground ">
              Loading templates...
            </h3>
          </div>
        </div>
      )}
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="in-app-notification-templates">
          <AccordionTrigger className="text-xl font-semibold">
            In-App Notifications
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
              {notificationTemplates &&
                notificationTemplates.map((template, index) => {
                  const isSelected =
                    editingTemplates?.templateName === template.templateName;
                  return (
                    <Button
                      key={index}
                      variant={"link"}
                      className="space-y-2 justify-start"
                      onClick={() => handleStartEditingTemplate(template)}
                    >
                      <ToolTip
                        content={template.templateDescription}
                        trigger={
                          <p
                            className={`font-medium text-md ${isSelected && "underline"} `}
                          >
                            {template.templateName}
                          </p>
                        }
                      />
                    </Button>
                  );
                })}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Separator />

      {editingTemplates && (
        <section>
          <form className="space-y-4 mb-8 p-4" onSubmit={handleUpdateTemplates}>
            <CardHeader className="flex flex-row flex-wrap gap-2 justify-between">
              <div className="space-y-2">
                <h3 className="font-semibold">
                  {editingTemplates.templateName}
                </h3>
                <p className="text-sm text-muted-foreground font-medium">
                  {editingTemplates.templateDescription}
                </p>
              </div>
              <Button
                type="button"
                onClick={() => {
                  setEditingTemplates(null);
                  setFormData(defaultFormData);
                }}
                className="flex gap-2 items-center"
                variant={"outline"}
                size={"sm"}
                disabled={isSubmitting}
              >
                <X className="h-4 w-4" />
                Close
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                  {editingTemplates?.marketCenters &&
                  editingTemplates?.marketCenters.length > 0 ? (
                    editingTemplates.marketCenters.map((marketCenter) => {
                      const findFormData = formData?.marketCenters.find(
                        (mc) => mc.id === marketCenter.id
                      );
                      const isChecked = findFormData
                        ? findFormData.isActive
                        : marketCenter.isActive;

                      return (
                        <div
                          key={`${marketCenter?.id}-${marketCenter?.templateId}`}
                          className="flex items-center gap-2 mr-4"
                        >
                          <Label className="text-md font-medium">
                            {marketCenter?.name ?? "Unknown Market Center"}
                          </Label>
                          <Switch
                            checked={isChecked}
                            onCheckedChange={(checked) => {
                              if (!editingTemplates) return;
                              setFormData((prev) => ({
                                ...prev,
                                marketCenters: prev.marketCenters.map((mc) =>
                                  mc.id === marketCenter.id
                                    ? {
                                        ...mc,
                                        isActive: Boolean(checked),
                                      }
                                    : mc
                                ),
                              }));
                            }}
                            disabled={isSubmitting || !editingTemplates}
                          />
                        </div>
                      );
                    })
                  ) : (
                    <p className="md:col-span-2 text-sm text-muted-foreground">
                      No market centers found
                    </p>
                  )}
                </div>
                <Label className="text-sm font-medium text-muted-foreground">
                  Enable or disable this notification for{" "}
                  {editingTemplates?.marketCenters &&
                  editingTemplates?.marketCenters.length > 1
                    ? "each market center"
                    : "your market center"}
                </Label>
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor={`subject-${editingTemplates.templateName}`}
                  className="text-md"
                >
                  Subject
                </Label>
                <NotificationEditor
                  label="subject"
                  id={`subject-${editingTemplates.templateName}`}
                  initialValue={editingTemplates.subject}
                  templateVariables={templateVariables}
                  isEditing={editingTemplates ? true : false}
                  value={formData.subject}
                  onChange={(value) => {
                    if (editingTemplates) {
                      setFormData({ ...formData, subject: value });
                    }
                  }}
                  disabled={isSubmitting || !editingTemplates}
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor={`body-${editingTemplates.templateName}`}
                  className="text-md"
                >
                  Body
                </Label>
                <NotificationEditor
                  label="body"
                  id={`body-${editingTemplates.templateName}`}
                  initialValue={editingTemplates.body}
                  templateVariables={templateVariables}
                  isEditing={editingTemplates ? true : false}
                  value={formData.body}
                  onChange={(value) => {
                    if (editingTemplates) {
                      setFormData({ ...formData, body: value });
                    }
                  }}
                  disabled={isSubmitting || !editingTemplates}
                />
              </div>
              <div className="pt-5 flex flex-wrap items-center gap-2 md:justify-end ">
                <Button
                  onClick={handleResetTemplateToDefault}
                  className="flex gap-2 items-center w-full md:w-fit"
                  variant={"outline"}
                  size={"sm"}
                  disabled={isSubmitting || !editingTemplates}
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset Subject & Body to Default
                </Button>

                <Button
                  type="submit"
                  className="flex gap-2 items-center w-full md:w-fit"
                  size={"sm"}
                  disabled={isSubmitting || !editingTemplates}
                >
                  <Save className="h-4 w-4" />
                  Save All Changes
                </Button>
              </div>
            </CardContent>
          </form>
        </section>
      )}
    </div>
  );
}
