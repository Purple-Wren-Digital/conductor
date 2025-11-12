"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { API_BASE } from "@/lib/api/utils";
import type {
  NotificationTemplate,
  NotificationTemplateFormData,
} from "@/lib/types";
import { Edit, Save, X } from "lucide-react";
import NotificationEditor from "@/components/ui/TextArea/NotificationEditor";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "../ui/card";

export default function NotificationTemplates({
  notificationTemplates,
  isLoading,
  refreshTemplates,
}: {
  notificationTemplates: NotificationTemplate[];
  isLoading: boolean;
  refreshTemplates: () => Promise<void>;
}) {
  const [editingTemplate, setEditingTemplate] =
    useState<NotificationTemplate | null>(null);
  const [formData, setFormData] = useState<NotificationTemplateFormData>({
    subject: "",
    body: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { getToken } = useAuth();

  const editTemplateMutation = useMutation({
    mutationFn: async () => {
      setIsSubmitting(true);
      const token = await getToken();
      if (!token) {
        console.error("Failed to get authentication token");
        return;
      }
      const response = await fetch(
        `${API_BASE}/notifications/templates/${editingTemplate?.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            subject: formData.subject,
            body: formData.body,
          }),
        }
      );
    },
    onSuccess: () => {
      setEditingTemplate(null);
      setFormData({ subject: "", body: "" });
      toast.success(`Template updated`);
    },
    onError: (error) => {
      console.error("Failed to update template", error);
      toast.error("Failed to update template");
    },
    onSettled: async () => {
      await refreshTemplates();
      setIsSubmitting(false);
    },
  });

  const handleStartEditingTemplate = (template: NotificationTemplate) => {
    setEditingTemplate(template);
    setFormData({
      subject: template.subject || "",
      body: template.body,
    });
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
            editingTemplate && editingTemplate?.id === template.id
              ? true
              : false;
          const templateVariables =
            template && template?.variables
              ? getTemplateVariables(template.variables)
              : undefined;
          return (
            <Card key={template.id}>
              <form
                className="space-y-4 mb-8 p-4"
                onSubmit={(e: React.FormEvent) => {
                  e.preventDefault();
                  editTemplateMutation.mutateAsync();
                }}
              >
                <CardHeader className="flex flex-row flex-wrap gap-2 justify-between">
                  <div className="space-y-2">
                    <h3 className="font-semibold">{template.templateName}</h3>
                    <p className="text-sm text-muted-foreground font-medium">
                      {template.templateDescription}
                    </p>
                  </div>
                  {isEditing ? (
                    <div className="flex gap-2 items-center flex-wrap">
                      <Button
                        type="button"
                        onClick={() => {
                          setEditingTemplate(null);
                          setFormData({ subject: "", body: "" });
                        }}
                        className="flex gap-2 items-center"
                        variant={"secondary"}
                        disabled={isSubmitting}
                      >
                        <X className="h-4 w-4" />
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        className="flex gap-2 items-center"
                        disabled={isSubmitting}
                      >
                        <Save className="h-4 w-4" />
                        Save
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      onClick={() => handleStartEditingTemplate(template)}
                      className="flex gap-2 items-center"
                      variant={"secondary"}
                      disabled={isSubmitting}
                    >
                      <Edit className="h-4 w-4" />
                      Edit Template
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor={`${index}-subject-${template.id}`}>
                      Subject
                    </Label>
                    <NotificationEditor
                      label="subject"
                      id={`${index}-subject-${template.id}`}
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
                    <Label htmlFor={`${index}-body-${template.id}`}>Body</Label>
                    <NotificationEditor
                      label="body"
                      id={`${index}-body-${template.id}`}
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
                </CardContent>
              </form>
            </Card>
          );
        })}
    </div>
  );
}
