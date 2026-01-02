"use client";

import { useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import type {
  FormErrors,
  Ticket,
  TicketTemplate,
  Urgency,
  UsersToNotify,
} from "@/lib/types";
import { API_BASE } from "@/lib/api/utils";
import { BaseTicketForm, type TicketFormValues } from "./base-ticket-form";
import { useUserRole } from "@/hooks/use-user-role";
import { useStore } from "@/context/store-provider";
import { ActivityUpdates } from "@/packages/transactional/emails/types";
import { createAndSendNotification } from "@/lib/utils/notifications";
import { toast } from "sonner";

type EditTicketFormProps = {
  disabled: boolean;
  ticket: Ticket | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updated: Ticket | null) => void;
};

const emptyValues: TicketFormValues = {
  title: "",
  description: "",
  urgency: "MEDIUM" as Urgency,
  categoryId: "",
  dueDate: undefined,
  assigneeId: "",
  todos: [],
};

export function EditTicketForm({
  disabled,
  ticket,
  isOpen,
  onClose,
  onSuccess,
}: EditTicketFormProps) {
  const { user: clerkUser } = useUser();
  const [values, setValues] = useState<TicketFormValues>(emptyValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);

  const [marketCenterId, setMarketCenterId] = useState<string | null>(null);

  const [templates, setTemplates] = useState<TicketTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  const { role } = useUserRole();
  const { currentUser } = useStore();
  const { getToken } = useAuth();

  useEffect(() => {
    if (ticket?.status === "RESOLVED") {
      return;
    }
    const fetchTemplates = async (mcId: string) => {
      try {
        const token = await getToken();
        if (!token) {
          throw new Error("Failed to get authentication token");
        }
        const res = await fetch(`${API_BASE}/ticket-templates/${mcId}`, {
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

    if (ticket) {
      setValues({
        title: ticket.title ?? "",
        description: ticket.description ?? "",
        urgency: ticket.urgency as Urgency,
        categoryId: ticket?.categoryId ?? "",
        dueDate: ticket.dueDate ? new Date(ticket.dueDate) : undefined,
        assigneeId: ticket?.assigneeId ? ticket.assigneeId : "Unassigned",
        todos: [],
      });
      setErrors({});

      const marketCenterId =
        ticket?.assignee?.marketCenterId ||
        ticket?.creator?.marketCenterId ||
        ticket?.category?.marketCenterId;

      const ticketMarketCenter =
        role === "ADMIN" && marketCenterId
          ? marketCenterId
          : (role === "STAFF" || role === "STAFF_LEADER" || role === "AGENT") &&
              currentUser?.marketCenterId
            ? currentUser.marketCenterId
            : null;

      setMarketCenterId(ticketMarketCenter);
      setSelectedTemplateId("");
      if (ticketMarketCenter) {
        fetchTemplates(ticketMarketCenter);
      } else {
        setTemplates([]);
      }
    }
  }, [isOpen, ticket, clerkUser, role, currentUser, getToken, marketCenterId]);

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
        urgency: t?.urgency || "MEDIUM",
        categoryId: t?.categoryId || "",
        dueDate: undefined,
        assigneeId: "Unassigned",
        todos: t.todos && t.todos.length > 0 ? [...t.todos] : [],
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
    if (role === "ADMIN" && !marketCenterId)
      next.marketCenter = "Market Center is required";
    if (!values.categoryId.trim()) next.category = "Category is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSendTicketNotifications = async ({
    ticket,
    userToNotify,
    changedDetails,
  }: {
    ticket: Ticket;
    userToNotify: UsersToNotify;
    changedDetails: ActivityUpdates[] | null;
  }) => {
    const title = ticket?.title ?? "";
    const notifySomeone = userToNotify.updateType === "unchanged";
    const notifyAssigneeChanges =
      userToNotify.updateType === "added" ||
      userToNotify.updateType === "removed";

    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Failed to get authentication token");
      }
      const response = await createAndSendNotification({
        getToken: getToken,
        templateName:
          notifyAssigneeChanges && userToNotify.updateType === "added"
            ? "Ticket Assignment - Added"
            : notifyAssigneeChanges && userToNotify.updateType === "removed"
              ? "Ticket Assignment - Removed"
              : "Ticket Updated",
        trigger: notifyAssigneeChanges ? "Ticket Assignment" : "Ticket Updated",
        receivingUser: {
          id: userToNotify?.id,
          name: userToNotify?.name,
          email: userToNotify?.email,
        },
        data: {
          updatedTicket:
            notifySomeone && changedDetails
              ? {
                  ticketNumber: ticket.id,
                  ticketTitle: ticket?.title ?? "No title provided",
                  createdOn: ticket?.createdAt,
                  updatedOn: ticket?.updatedAt,
                  editorName: currentUser?.name ?? "Unknown",
                  editorId: currentUser?.id ?? "",
                  changedDetails: changedDetails,
                }
              : undefined,
          ticketAssignment: notifyAssigneeChanges
            ? {
                ticketNumber: ticket.id,
                ticketTitle: title,
                createdOn: ticket?.createdAt,
                updatedOn: ticket?.createdAt,
                editorName: currentUser?.name ?? "Unknown",
                editorId: currentUser?.id ?? "",
                updateType: userToNotify.updateType,
                currentAssignment: {
                  id: userToNotify?.id,
                  name: userToNotify?.name,
                },
                previousAssignment: null,
              }
            : undefined,
        },
      });
    } catch (error) {
      console.error(
        "TicketDetailView - Unable to generate notifications",
        error
      );
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (ticket?.status === "RESOLVED") {
      setErrors((prev) => ({
        ...prev,
        general: "Resolved tickets cannot be edited",
      }));
      toast.error("Resolved tickets cannot be edited");
      return;
    }
    if (role === "STAFF" && ticket?.assigneeId !== currentUser?.id) {
      setErrors((prev) => ({
        ...prev,
        general: "You do not have permission to edit this ticket",
      }));
      toast.error("You do not have permission to edit this ticket");
      return;
    }

    if (!validate() || !ticket?.id) {
      setErrors((prev) => ({
        ...prev,
        general: "Please fix the errors above",
      }));
      toast.error("Invalid input(s)");
      return;
    }
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Failed to get authentication token");
      }
      const res = await fetch(`${API_BASE}/tickets/update/${ticket.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
        body: JSON.stringify({
          ...values,
          dueDate: values.dueDate ? values.dueDate : undefined,
          assigneeId: values.assigneeId ? values.assigneeId : undefined,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to edit ticket (${res.status}): ${text}`);
      }
      const data = await res.json();
      if (
        data &&
        data?.ticket &&
        data?.usersToNotify &&
        data?.usersToNotify?.length > 0
      ) {
        await Promise.all(
          data.usersToNotify.map(async (user: UsersToNotify) => {
            await handleSendTicketNotifications({
              ticket: data.ticket as Ticket,
              userToNotify: user,
              changedDetails: data?.changedDetails ?? [],
            });
          })
        );
      }

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
      marketCenterId={marketCenterId}
      disabled={ticket?.status === "RESOLVED" || disabled}
    />
  );
}
