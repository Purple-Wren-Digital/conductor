"use client";

import { useEffect, useState } from "react";
import type {
  FormErrors,
  Ticket,
  TicketNotificationCallback,
  TicketTemplate,
  Urgency,
  UsersToNotify,
} from "@/lib/types";
import { useUser } from "@clerk/nextjs";
import { API_BASE } from "@/lib/api/utils";
import { BaseTicketForm, type TicketFormValues } from "./base-ticket-form";
import { useUserRole } from "@/hooks/use-user-role";
import { useStore } from "@/context/store-provider";
import {
  ActivityUpdates,
  AssignmentUpdateType,
} from "@/packages/transactional/emails/types";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

type Props = {
  ticket: Ticket | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (
    updated: Ticket | null,
    users?: {
      id: string;
      name: string;
      email: string;
      updateType: "creator" | "assignee";
    }[]
  ) => void;
  handleSendTicketNotifications: ({
    trigger,
    receivingUser,
    data,
  }: TicketNotificationCallback) => Promise<void>;
};

const emptyValues: TicketFormValues = {
  title: "",
  description: "",
  urgency: "MEDIUM" as Urgency,
  categoryId: "",
  dueDate: undefined,
  assigneeId: undefined,
};

export function EditTicketForm({
  ticket,
  isOpen,
  onClose,
  onSuccess,
  handleSendTicketNotifications,
}: Props) {
  const { user: clerkUser } = useUser();
  const [values, setValues] = useState<TicketFormValues>(emptyValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);

  const [marketCenterId, setMarketCenterId] = useState<string | null>(null);

  const [templates, setTemplates] = useState<TicketTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  const { role } = useUserRole();
  const { currentUser } = useStore();

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const accessToken = clerkUser?.id || "";
        const res = await fetch(`${API_BASE}/ticket-templates`, {
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
        title: ticket.title ?? "",
        description: ticket.description ?? "",
        urgency: ticket.urgency as Urgency,
        categoryId: ticket.categoryId ?? "",
        dueDate: ticket.dueDate ? new Date(ticket.dueDate) : undefined,
        assigneeId: ticket.assigneeId ?? "Unassigned",
      });
      setErrors({});

      const ticketMarketCenter =
        ticket?.category?.marketCenterId ||
        ticket?.assignee?.marketCenterId ||
        null;

      const userMarketCenterId =
        role === "ADMIN"
          ? ticketMarketCenter
          : role === "STAFF" && currentUser?.marketCenterId
            ? currentUser.marketCenterId
            : null;

      setMarketCenterId(userMarketCenterId);
      setSelectedTemplateId("");
      fetchTemplates();
    }
  }, [isOpen, ticket, clerkUser, role, currentUser]);

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
        categoryId: t.category,
        dueDate: undefined,
      });
    }
  };

  const onChange = (patch: Partial<TicketFormValues>) => {
    setValues((prev) => ({ ...prev, ...patch }));
  };
  const validate = (): boolean => {
    const next: FormErrors = {};
    if (!values.title.trim()) next.title = "Title is required";
    if (!values.description.trim())
      next.description = "Description is required";
    // if (!marketCenterId) next.marketCenter = "Market Center is required";
    if (!values.categoryId.trim()) next.category = "Category is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const updateTicketMutation = useMutation({
    mutationFn: async () => {
      if (!clerkUser?.id || !ticket?.id) throw new Error("Missing auth");

      const res = await fetch(`${API_BASE}/tickets/update/${ticket.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${clerkUser.id}`,
        },
        cache: "no-store",
        body: JSON.stringify({
          ...values,
          dueDate: values.dueDate ? values.dueDate : undefined,
          assigneeId: values.assigneeId ? values.assigneeId : undefined,
        }),
      });
      console.log("UPDATED TICKET - RESPONSE");
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to edit ticket (${res.status}): ${text}`);
      }
      const data = await res.json();
      console.log("UPDATED TICKET - DATA", data);
      return data;
    },
    onSuccess: async (data: {
      ticket: Ticket;
      usersToNotify: UsersToNotify[];
      changedDetails: ActivityUpdates[];
    }) => {
      const updatedTicket = data ? data?.ticket : null;
      toast.success(
        `${updatedTicket?.title ? updatedTicket.title : "Ticket"} was updated`
      );
      if (updatedTicket) {
        const ticket = data.ticket as Ticket;
        const title = ticket?.title ?? "Untitled";
        const usersToNotify = data?.usersToNotify ?? [];
        const changedDetails: ActivityUpdates[] = data?.changedDetails ?? [];

        if (usersToNotify && usersToNotify?.length > 0) {
          await Promise.all(
            usersToNotify.map(
              async (user: {
                id: string;
                name: string;
                email: string;
                updateType: AssignmentUpdateType;
              }) => {
                const notifySomeone = user.updateType === "unchanged";
                const notifyAssigneeChanges =
                  user.updateType === "added" || user.updateType === "removed";
                await handleSendTicketNotifications({
                  trigger: notifyAssigneeChanges
                    ? "Ticket Assignment"
                    : "Ticket Updated",
                  receivingUser: {
                    id: user?.id,
                    name: user?.name ?? "Name",
                    email: user?.email,
                  },
                  data: {
                    updatedTicket: notifySomeone
                      ? {
                          ticketNumber: ticket.id,
                          ticketTitle: title,
                          createdOn: ticket?.createdAt,
                          updatedOn: ticket?.updatedAt,
                          editedByName: currentUser?.name ?? "Unknown",
                          editedById: currentUser!.id,
                          changedDetails: changedDetails,
                        }
                      : undefined,
                    ticketAssignment: notifyAssigneeChanges
                      ? {
                          ticketNumber: ticket.id,
                          ticketTitle: title,
                          createdOn: ticket?.createdAt,
                          updatedOn: ticket?.createdAt,
                          editedByName: currentUser?.name ?? "Unknown",
                          editedById: currentUser!.id,
                          updateType: user.updateType,
                          currentAssignment: { id: user?.id, name: user?.name },
                          previousAssignment: null,
                        }
                      : undefined,
                  },
                });
              }
            )
          );
        }
      }
      onSuccess(updatedTicket);
      onClose();
    },
    onError: (error) => {
      console.error("Failed to edit ticket", error);
      toast.error(`Error: Unable to save changes`);
    },
    onSettled: async () => {
      setLoading(false);
    },
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !ticket?.id) return;
    setLoading(true);
    updateTicketMutation.mutate();
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
      marketCenterId={marketCenterId}
    />
  );
}
