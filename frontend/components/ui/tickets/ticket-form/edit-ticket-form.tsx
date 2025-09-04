"use client";

import { useEffect, useState } from "react"; // useCallback,
import type { Ticket, TicketTemplate, Urgency } from "@/lib/types";
// import { getAccessToken } from "@auth0/nextjs-auth0"
import {
  BaseTicketForm,
  type TicketFormValues,
  type TicketFormErrors,
} from "./base-ticket-form";
import { toast } from "sonner";
import { hasDueDateChanged } from "./utils";

type Props = {
  ticket: Ticket | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (created: Ticket | null) => void;
};

export type PossibleChangesProps = {
  label: string;
  originalValue: string | null;
  newValue: string;
};

export type EditedTicketNotificationProps = {
  ticketNumber: string;
  createdOn: Date;
  updatedOn: Date;
  changes: PossibleChangesProps[];
};

export function EditTicketForm({ ticket, isOpen, onClose, onSuccess }: Props) {
  const initialValues: TicketFormValues = {
    title: ticket?.title ?? "",
    description: ticket?.description ?? "",
    urgency: ticket?.urgency ?? ("MEDIUM" as Urgency),
    category: ticket?.category ?? "",
    dueDate: ticket?.dueDate ?? undefined,
    creatorId: "u1", // TODO: HARDCODED USER ticket?.creator?.id
  };
  const [values, setValues] = useState<TicketFormValues>(initialValues);
  const [errors, setErrors] = useState<TicketFormErrors>({});
  const [loading, setLoading] = useState(false);

  const [templates, setTemplates] = useState<TicketTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  // const getAuthToken = useCallback(async () => {
  //   if (process.env.NODE_ENV === "development") return "local"
  //   return await getAccessToken()
  // }, [])

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        // const accessToken = await getAuthToken();
        const res = await fetch("/api/ticket-templates", {
          // headers: { Authorization: `Bearer ${accessToken}` },
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
  }, [isOpen]); //, getAuthToken]);

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
        creatorId: "u1",
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

  const findChangedFormValues = (ticket: Ticket) => {
    let changedValues: PossibleChangesProps[] = [];
    const dueDateChanged = hasDueDateChanged(
      initialValues?.dueDate,
      ticket?.dueDate
    );
    if (dueDateChanged.isChanged !== "unchanged") {
      changedValues = [
        ...changedValues,
        {
          label: "Due Date",
          originalValue: initialValues?.dueDate
            ? `${new Date(initialValues.dueDate).toLocaleDateString()}`
            : "N/a",
          newValue: ticket?.dueDate
            ? `${new Date(ticket.dueDate).toLocaleDateString()}`
            : "N/a",
        },
      ];
    }

    if (initialValues.urgency !== ticket.urgency) {
      changedValues = [
        ...changedValues,
        {
          label: "Urgency",
          originalValue: initialValues.urgency,
          newValue: ticket.urgency,
        },
      ];
    }

    if (initialValues.category !== ticket.category) {
      changedValues = [
        ...changedValues,
        {
          label: "Category",
          originalValue: initialValues.category,
          newValue: ticket.category,
        },
      ];
    }
    if (initialValues.description !== ticket.description) {
      changedValues = [
        ...changedValues,
        {
          label: "Description",
          originalValue: initialValues.description,
          newValue: ticket.description,
        },
      ];
    }

    if (initialValues.title !== ticket.title) {
      changedValues = [
        ...changedValues,
        {
          label: "Title",
          originalValue: initialValues.title,
          newValue: ticket.title,
        },
      ];
    }
    return changedValues;
  };

  const sendEmailNotification = async (ticket: Ticket | null) => {
    if (
      !ticket ||
      !ticket.id ||
      !ticket?.title ||
      !ticket?.createdAt ||
      !ticket?.updatedAt
    ) {
      throw new Error("Ticket was null");
    }
    const ticketEdits = findChangedFormValues(ticket);
    console.log("Edited Tickets", ticketEdits);
    if (!ticketEdits) {
      throw new Error("No changes found - TODO: Due Date Changes");
    }

    const ticketEditedEmailBody = {
      emailData: {
        ticketNumber: ticket?.id,
        ticketTitle: ticket?.title,
        createdOn: ticket?.createdAt,
        updatedOn: ticket?.updatedAt,
        changedDetails: ticketEdits,
      },
    };

    console.log("Ticket Edits Email Body", ticketEditedEmailBody);

    try {
      const response = await fetch("/api/send/editTicket", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify(ticketEditedEmailBody),
      });
      if (!response.ok) {
        console.error("Failed to send email, status:", response.status);
      } else {
        const data = await response.json();
        console.log("Email sent successfully:", data);
        toast.success("Ticket updated! Confirmation email sent.");
      }
    } catch (err) {
      console.error("Failed to send email", err);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      // const accessToken = await getAuthToken();
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error("Failed to create ticket");
      const data = await res.json().catch(() => ({}));
      onSuccess(data?.ticket ?? null);
      sendEmailNotification(data?.ticket ?? null);
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
