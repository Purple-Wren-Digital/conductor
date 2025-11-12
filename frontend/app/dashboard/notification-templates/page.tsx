"use client";

import { useCallback, useEffect, useState } from "react";
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

export default function NotificationTemplatesPage() {
  const [notificationTemplates, setNotificationTemplates] = useState<
    NotificationTemplate[]
  >([]);
  const [editingTemplate, setEditingTemplate] =
    useState<NotificationTemplate | null>(null);
  const [formData, setFormData] = useState<NotificationTemplateFormData>({
    subject: "",
    body: "",
  });

  const { getToken } = useAuth();

  const fetchAllNotificationTemplates = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) {
        console.error("Failed to get authentication token");
        return;
      }
      const response = await fetch(`${API_BASE}/notifications/templates`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      const data = await response.json();
      if (data?.templates) {
        setNotificationTemplates(data.templates);
      }
    } catch (error) {
      console.error("Failed to fetch notification templates", error);
    }
  }, [getToken]);

  useEffect(() => {
    fetchAllNotificationTemplates();
  }, [fetchAllNotificationTemplates]);

  const handleResetAllToDefault = async () => {
    try {
      const token = await getToken();
      if (!token) {
        console.error("Failed to get authentication token");
        return;
      }
      const response = await fetch(
        `${API_BASE}/notifications/templates/reset-all`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (response.ok) {
        await fetchAllNotificationTemplates();
      } else {
        console.error("Failed to reset notification templates");
      }
    } catch (error) {
      console.error("Error resetting notification templates:", error);
    }
  };

  const submitEditTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
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
      console.log("Edit response:", response);
      if (response.ok) {
        // Refresh the list of templates after editing
        setEditingTemplate(null);
        setFormData({ subject: "", body: "" });
      } else {
        console.error("Failed to submit edited template");
      }
    } catch (error) {
      console.error("Error submitting edited template:", error);
    } finally {
      await fetchAllNotificationTemplates();
    }
  };

  const handleEditTemplate = (template: NotificationTemplate) => {
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
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">
            Notification Templates
          </h1>
          <Button onClick={handleResetAllToDefault}>
            Reset All to Default
          </Button>
        </div>
        <p className="text-muted-foreground">
          Customize default notification templates
        </p>
      </div>

      <div>
        {notificationTemplates.map((template, index) => {
          const isEditing =
            editingTemplate && editingTemplate?.id === template.id
              ? true
              : false;
          const templateVariables =
            template && template?.variables
              ? getTemplateVariables(template.variables)
              : undefined;
          return (
            <form
              key={template.id}
              className="space-y-4 mb-8 p-4"
              onSubmit={submitEditTemplate}
            >
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <h3 className=" font-semibold">{template.templateName}</h3>
                  <p className="text-sm text-muted-foreground font-medium">
                    {template.templateDescription}
                  </p>
                </div>
                {isEditing ? (
                  <div className="flex gap-2 items-center flex-wrap">
                    <Button
                      type="button"
                      onClick={() => setEditingTemplate(null)}
                      className="flex gap-2 items-center"
                      variant={"secondary"}
                    >
                      <X className="h-4 w-4" />
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      onClick={(e) => submitEditTemplate(e)}
                      className="flex gap-2 items-center"
                    >
                      <Save className="h-4 w-4" />
                      Save
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    onClick={() => handleEditTemplate(template)}
                    className="flex gap-2 items-center"
                    variant={"secondary"}
                  >
                    <Edit className="h-4 w-4" />
                    Edit Template
                  </Button>
                )}
              </div>

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
                />
              </div>
            </form>
          );
        })}
      </div>
    </div>
  );
}
