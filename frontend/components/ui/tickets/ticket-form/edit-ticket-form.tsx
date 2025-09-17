"use client";

import { useCallback, useEffect, useState } from "react";
import type { Ticket, TicketTemplate, Urgency } from "@/lib/types";
import { getAccessToken } from "@auth0/nextjs-auth0";
import {
  BaseTicketForm,
  type TicketFormValues,
  type TicketFormErrors,
} from "./base-ticket-form";

type Props = {
  ticket: Ticket | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updated: Ticket | null) => void;
};

const emptyValues: TicketFormValues = {
  title: "",
  description: "",
  urgency: "MEDIUM" as Urgency,
  category: "",
  dueDate: undefined,
};

export function EditTicketForm({ ticket, isOpen, onClose, onSuccess }: Props) {
  const [values, setValues] = useState<TicketFormValues>(emptyValues);
  const [errors, setErrors] = useState<TicketFormErrors>({});
  const [loading, setLoading] = useState(false);

  const [templates, setTemplates] = useState<TicketTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  const getAuth0AccessToken = useCallback(async () => {
    if (process.env.NODE_ENV === "development") return "local";
    return await getAccessToken();
  }, []);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const accessToken = await getAuth0AccessToken();
        const res = await fetch("/api/ticket-templates", {
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

    if (isOpen && ticket) {
      setValues({
        title: ticket.title,
        description: ticket.description,
        urgency: ticket.urgency as Urgency,
        category: ticket.category,
        dueDate: ticket.dueDate ? new Date(ticket.dueDate) : undefined,
      });
      setErrors({});
      setSelectedTemplateId("");
      fetchTemplates();
    }
  }, [isOpen, ticket, getAuth0AccessToken]);

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);

    if (templateId === "none") {
      setValues(emptyValues);
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

  const onChange = (patch: Partial<TicketFormValues>) => {
    setValues((prev) => ({ ...prev, ...patch }));
  };
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
    if (!validate() || !ticket?.id) return;
    setLoading(true);
    try {
      const accessToken = await getAuth0AccessToken();
      const res = await fetch(`/api/tickets/update/${ticket.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
        body: JSON.stringify({
          ...values,
          dueDate: values.dueDate ? values.dueDate : undefined,
        }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Failed to edit ticket (${res.status}): ${text}`);
      }
      const data = await res.json();
      onSuccess(data ? data?.ticket : null);
      onClose();
    } catch (err) {
      console.error(err);
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
      titleText={"Editing Ticket"}
      showTemplateSelect
      templates={templates}
      selectedTemplateId={selectedTemplateId}
      onChangeTemplateId={handleTemplateChange}
    />
  );
}
