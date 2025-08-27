"use client";

import { useCallback, useEffect, useState } from "react";
import type { Ticket, TicketTemplate, Urgency } from "@/lib/types";
import { getAccessToken } from "@auth0/nextjs-auth0";
// import {}
import {
  BaseTicketForm,
  type TicketFormValues,
  type TicketFormErrors,
} from "./base-ticket-form";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (created: Ticket | null) => void;
};

const initialValues: TicketFormValues = {
  title: "",
  description: "",
  urgency: "MEDIUM" as Urgency,
  category: "",
  dueDate: undefined,
};

export function CreateTicketForm({ isOpen, onClose, onSuccess }: Props) {
  const [values, setValues] = useState<TicketFormValues>(initialValues);
  const [errors, setErrors] = useState<TicketFormErrors>({});
  const [loading, setLoading] = useState(false);

  const [templates, setTemplates] = useState<TicketTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  const getAuthToken = useCallback(async () => {
    //   if (process.env.NODE_ENV === "development") return "local";
    return await getAccessToken();
  }, []);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const accessToken = await getAuthToken();
        console.log("fetchTemplates accessToken", accessToken);
        const res = await fetch("/api/ticket/ticket-templates", {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Failed to fetch templates");
        const data = await res.json();
        setTemplates(data.templates || []);
      } catch (e) {
        console.error(e);
        setTemplates([]);
      }
    };

    if (isOpen) {
      setValues(initialValues);
      setErrors({});
      setSelectedTemplateId("");
      fetchTemplates();
    }
  }, [isOpen, getAuthToken]);

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);

    if (templateId === "none") {
      setValues(initialValues);
      return;
    }

    const t = templates.find((tpl) => tpl.id === templateId);
    if (t) {
      setValues({
        title: t.title,
        description: t.ticketDescription,
        urgency: t.urgency,
        category: t.category,
        dueDate: undefined,
      });
    }
  };

  const onChange = (patch: Partial<TicketFormValues>) =>
    setValues((prev) => ({ ...prev, ...patch }));

  const validate = (): boolean => {
    const next: TicketFormErrors = {};
    if (!values.title.trim()) next.title = "Title is required";
    if (!values.description.trim())
      next.description = "Description is required";
    if (!values.category.trim()) next.category = "Category is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const accessToken = await getAuthToken();
      console.log("onSubmit accessToken", accessToken);

      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error("Failed to create ticket");
      const data = await res.json().catch(() => ({}));
      onSuccess(data?.ticket ?? null);
      onClose();
    } catch (err) {
      console.error("failed to create ticket", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <BaseTicketForm
      isOpen={isOpen}
      onClose={onClose}
      values={values}
      errors={errors}
      loading={loading}
      onChange={onChange}
      onSubmit={onSubmit}
      titleText="Create New Ticket"
      showTemplateSelect
      templates={templates}
      selectedTemplateId={selectedTemplateId}
      onChangeTemplateId={handleTemplateChange}
    />
  );
}
