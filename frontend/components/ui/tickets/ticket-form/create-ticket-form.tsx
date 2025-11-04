"use client";

import { useEffect, useState } from "react";
import type {
  FormErrors,
  PrismaUser,
  Ticket,
  TicketNotificationCallback,
  TicketTemplate,
  Urgency,
  UsersToNotify,
} from "@/lib/types";
import { useAuth, useUser } from "@clerk/nextjs";
import { BaseTicketForm, type TicketFormValues } from "./base-ticket-form";
import { API_BASE } from "@/lib/api/utils";
import { useUserRole } from "@/hooks/use-user-role";
import { useStore } from "@/context/store-provider";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (
    created: Ticket | null,
    usersToNotify?: {
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

const initialValues: TicketFormValues = {
  title: "",
  description: "",
  urgency: "MEDIUM" as Urgency,
  categoryId: "",
  dueDate: undefined,
  assigneeId: "Unassigned",
};

export function CreateTicketForm({
  isOpen,
  onClose,
  onSuccess,
  handleSendTicketNotifications,
}: Props) {
  const { user: clerkUser, isLoaded } = useUser();
  const [values, setValues] = useState<TicketFormValues>(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);

  const [marketCenterId, setMarketCenterId] = useState<string | null>(null);

  const [templates, setTemplates] = useState<TicketTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  const { role } = useUserRole();
  const { currentUser } = useStore();
  const { getToken } = useAuth();

  useEffect(() => {
    const fetchTemplates = async () => {
      if (!isLoaded) return;

      try {
        const token = await getToken();
        if (!token) {
          throw new Error("Failed to get authentication token");
        }
        const res = await fetch(`${API_BASE}/ticket-templates`, {
          headers: { Authorization: `Bearer ${token}` },
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
      setValues(initialValues);
      setErrors({});
      setSelectedTemplateId("");
      fetchTemplates();
    }

    const userMarketCenterId =
      role === "STAFF" && currentUser?.marketCenterId
        ? currentUser.marketCenterId
        : null;

    setMarketCenterId(userMarketCenterId);
  }, [isOpen, isLoaded, clerkUser, role, currentUser, getToken]);

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
        categoryId: t.category,
        dueDate: undefined,
      });
    }
  };

  const onChange = (patch: Partial<TicketFormValues>) =>
    setValues((prev) => ({ ...prev, ...patch }));

  const validate = (): boolean => {
    const errors: any = {};
    if (!values.title.trim()) errors.title = "Title is required";
    if (!values.description.trim())
      errors.description = "Description is required";
    if (!values.categoryId.trim()) {
      errors.category = "Category is required";
      errors.marketCenter = "Please select a market center";
    }
    setErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    if (!isLoaded) {
      console.error("User not loaded yet");
      return;
    }

    setLoading(true);
    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Failed to get authentication token");
      }
      const res = await fetch(`${API_BASE}/tickets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error("Failed to create ticket");
      const data = await res.json();
      if (data && data?.ticket) {
        const ticket = data.ticket as Ticket;
        const title = ticket?.title ?? "";
        const dueDate = ticket?.dueDate ? ticket.dueDate : undefined;
        const creator = ticket?.creator as PrismaUser;
        const assignee = ticket?.assignee as PrismaUser;

        let usersToNotify: UsersToNotify[] = [];
        if (creator) {
          usersToNotify.push({
            id: creator.id,
            name: creator?.name ?? "No name",
            email: creator.email,
            updateType: "created",
          });
        }
        if (ticket?.assigneeId && assignee) {
          usersToNotify.push({
            id: ticket.assigneeId,
            name: assignee.name ?? "No name",
            email: assignee.email,
            updateType: "added",
          });
        }

        if (usersToNotify && usersToNotify?.length > 0) {
          await Promise.all(
            usersToNotify.map(async (user) => {
              const notifyCreator = user.updateType === "created";
              const notifyAssignee = user.updateType === "added";
              await handleSendTicketNotifications({
                trigger: notifyAssignee
                  ? "Ticket Assignment"
                  : "Ticket Created",
                receivingUser: {
                  id: user?.id,
                  name: user?.name,
                  email: user?.email,
                },
                data: {
                  createdTicket: notifyCreator
                    ? {
                        ticketNumber: ticket.id,
                        ticketTitle: title,
                        creatorName: creator?.name ?? "Unknown",
                        creatorId: creator!.id,
                        createdOn: ticket?.createdAt,
                        dueDate: dueDate,
                      }
                    : undefined,
                  ticketAssignment: notifyAssignee
                    ? {
                        ticketNumber: ticket.id,
                        ticketTitle: title,
                        createdOn: ticket?.createdAt,
                        updatedOn: ticket?.createdAt,
                        editedByName: creator?.name ?? "Unknown",
                        editedById: creator!.id,
                        updateType: user.updateType,
                        currentAssignment: { id: user?.id, name: user?.name },
                        previousAssignment: null,
                      }
                    : undefined,
                },
              });
            })
          );
        }
      }
      onSuccess(data?.ticket ?? null);
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
      titleText="Create New Ticket"
      showTemplateSelect
      templates={templates}
      selectedTemplateId={selectedTemplateId}
      onChangeTemplateId={handleTemplateChange}
      marketCenterId={marketCenterId}
    />
  );
}
