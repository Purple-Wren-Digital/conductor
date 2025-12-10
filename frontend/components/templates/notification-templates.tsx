"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { API_BASE } from "@/lib/api/utils";
import type { NotificationTemplateFormData } from "@/lib/types";
import { Edit, RotateCcw, Save, X } from "lucide-react";
import NotificationEditor from "@/components/ui/TextArea/NotificationEditor";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";

const defaultFormData: NotificationTemplateFormData = {
  subject: "",
  body: "",
  marketCenters: [
    {
      name: "",
      id: "",
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

  const resetForm = () => {
    setEditingTemplates(null);
    setFormData(defaultFormData);
  };

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
        isActive: mc.isActive,
      })),
    });
  };

  const editTemplateMutation = useMutation({
    mutationFn: async () => {
      if (
        !editingTemplates ||
        !editingTemplates.marketCenters ||
        !editingTemplates.marketCenters.length
      )
        throw new Error("No templates found to edit");
      const token = await getToken();
      if (!token) throw new Error("Failed to get authentication token");

      const response = await fetch(
        `${API_BASE}/notifications/templates/reset`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            templateIds: editingTemplates.marketCenters.map(
              (mc) => mc.templateId
            ),
            type: editingTemplates.type,
            name: editingTemplates.templateName,
          }),
        }
      );

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Failed to update template: ${text}`);
      }
    },
    onSuccess: () => {
      resetForm();
      toast.success(`Template reset successfully`);
    },
    onError: () => {
      toast.error("Failed to update template");
    },
  });

  const resetTemplatesMutation = useMutation({
    mutationFn: async () => {
      setIsSubmitting(true);

      if (
        !editingTemplates ||
        !editingTemplates.marketCenters ||
        !editingTemplates.marketCenters.length
      )
        throw new Error("No templates found to edit");
      const token = await getToken();
      if (!token) throw new Error("Failed to get authentication token");

      let lastUpdatedMarketCenterName = "";

      for (const marketCenter of editingTemplates.marketCenters) {
        const response = await fetch(
          `${API_BASE}/notifications/templates/${marketCenter.templateId}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              subject: formData.subject,
              body: formData.body,
              isActive: formData.marketCenters.find(
                (mc) => mc.id === marketCenter.id
              )?.isActive,
            }),
          }
        );

        if (!response.ok) {
          const text = await response.text();
          throw new Error(`Failed to update template: ${text}`);
        }

        lastUpdatedMarketCenterName = marketCenter.name;
      }

      return lastUpdatedMarketCenterName;
    },
    onSuccess: (marketCenterName) => {
      resetForm();
      toast.success(`Template updated for ${marketCenterName}`);
    },
    onError: () => {
      toast.error("Failed to update template");
    },
    onSettled: async () => {
      await refreshTemplates();
      setIsSubmitting(false);
    },
  });

  const handleResetTemplateToDefault = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !editingTemplates ||
      !editingTemplates?.marketCenters ||
      !editingTemplates?.marketCenters.length
    ) {
      return;
    }

    resetTemplatesMutation.mutateAsync();
  };

  const handleUpdateTemplates = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !editingTemplates ||
      !editingTemplates?.marketCenters ||
      !editingTemplates?.marketCenters.length
    ) {
      return;
    }
    setIsSubmitting(true);

    editTemplateMutation.mutateAsync();

    await refreshTemplates();
    setIsSubmitting(false);
  };

  function getTemplateVariables(obj: any) {
    let formattedVariables: any[] = [];
    if (!obj) return formattedVariables;
    Object.entries(obj).forEach(([key, value]) => {
      formattedVariables.push(value);
    });
    return formattedVariables;
  }

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
      {notificationTemplates &&
        notificationTemplates.map((template, index) => {
          const isEditing =
            editingTemplates &&
            editingTemplates?.templateName === template.templateName
              ? true
              : false;
          const templateVariables =
            template && template?.variables
              ? getTemplateVariables(template.variables)
              : undefined;

          return (
            <Card key={template.templateName + index}>
              <form
                className="space-y-4 mb-8 p-4"
                onSubmit={handleUpdateTemplates}
              >
                <CardHeader className="flex flex-row flex-wrap gap-2 justify-between">
                  <div className="space-y-2">
                    <h3 className="font-semibold">{template.templateName}</h3>
                    <p className="text-sm text-muted-foreground font-medium">
                      {template.templateDescription}
                    </p>
                  </div>
                  {isEditing ? (
                    <Button
                      type="button"
                      onClick={resetForm}
                      className="flex gap-2 items-center"
                      variant={"outline"}
                      size={"sm"}
                      disabled={isSubmitting}
                    >
                      <X className="h-4 w-4" />
                      Cancel
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={() => handleStartEditingTemplate(template)}
                      className="flex gap-2 items-center"
                      variant={"outline"}
                      size={"sm"}
                      disabled={isSubmitting || isEditing}
                    >
                      <Edit className="h-4 w-4" />
                      Edit Template
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="isActive" className="mr-2">
                      Market Centers
                    </Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                      {template?.marketCenters &&
                      template?.marketCenters.length > 0 ? (
                        template.marketCenters.map((marketCenter) => {
                          const findFormData = formData?.marketCenters.find(
                            (mc) => mc.id === marketCenter.id
                          );
                          const isChecked =
                            isEditing && findFormData
                              ? findFormData.isActive
                              : marketCenter.isActive;

                          return (
                            <div
                              key={`${marketCenter?.id}-${marketCenter?.templateId}`}
                              className="flex items-center gap-2 mr-4"
                            >
                              <Checkbox
                                id="isActive"
                                checked={isChecked}
                                onCheckedChange={(checked) => {
                                  if (!isEditing) return;

                                  setFormData((prev) => ({
                                    ...prev,
                                    marketCenters: prev.marketCenters.map(
                                      (mc) =>
                                        mc.id === marketCenter.id
                                          ? {
                                              ...mc,
                                              isActive: Boolean(checked),
                                            }
                                          : mc
                                    ),
                                  }));
                                }}
                                disabled={isSubmitting || !isEditing}
                              />
                              <span className="text-sm">
                                {marketCenter?.name ?? "Unknown"}
                              </span>
                            </div>
                          );
                        })
                      ) : (
                        <p className="md:col-span-2 text-sm text-muted-foreground">
                          Not assigned to any market centers
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor={`${index}-subject-${template.templateName}`}
                    >
                      Subject
                    </Label>
                    <NotificationEditor
                      label="subject"
                      id={`${index}-subject-${template.templateName}`}
                      initialValue={template.subject}
                      templateVariables={templateVariables}
                      isEditing={isEditing}
                      value={isEditing ? formData.subject : template.subject}
                      onChange={(value) => {
                        if (isEditing) {
                          setFormData({ ...formData, subject: value });
                        }
                      }}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`${index}-body-${template.templateName}`}>
                      Body
                    </Label>
                    <NotificationEditor
                      label="body"
                      id={`${index}-body-${template.templateName}`}
                      initialValue={template.body}
                      templateVariables={templateVariables}
                      isEditing={isEditing}
                      value={isEditing ? formData.body : template.body}
                      onChange={(value) => {
                        if (isEditing) {
                          setFormData({ ...formData, body: value });
                        }
                      }}
                      disabled={isSubmitting}
                    />
                  </div>
                  {isEditing && (
                    <div className="pt-5 flex flex-wrap items-center gap-2 md:justify-end ">
                      <Button
                        onClick={handleResetTemplateToDefault}
                        className="flex gap-2 items-center w-full md:w-fit"
                        variant={"outline"}
                        size={"sm"}
                        disabled={isSubmitting}
                      >
                        <RotateCcw className="h-4 w-4" />
                        Reset Subject & Body to Default
                      </Button>

                      <Button
                        type="submit"
                        className="flex gap-2 items-center w-full md:w-fit"
                        size={"sm"}
                        disabled={isSubmitting}
                      >
                        <Save className="h-4 w-4" />
                        Save All Changes
                      </Button>
                    </div>
                  )}
                </CardContent>
              </form>
            </Card>
          );
        })}
    </div>
  );
}
