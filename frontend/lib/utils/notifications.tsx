import { API_BASE } from "@/lib/api/utils";
import {
  CreateNotificationPayload,
  NotificationData,
  NotificationTemplate,
} from "@/lib/types";
import { arrayToCommaSeparatedListWithConjunction } from "../utils";
import {
  ActivityUpdates,
  NewUserInvitationProps,
} from "@/packages/transactional/emails/types";

type GetTokenOptions = {
  template?: string | undefined;
  organizationId?: string | undefined;
  leewayInSeconds?: number | undefined;
  skipCache?: boolean | undefined;
};

type GetToken = (options?: GetTokenOptions) => Promise<string | null>;

export type NotificationContent = {
  getToken: GetToken;
  templateName: string;
  trigger:
    | "App Permissions"
    | "Invitation"
    | "Account Information"
    | "Ticket Created"
    | "Ticket Updated"
    | "Ticket Assignment"
    | "Mentions"
    | "New Comments"
    | "Market Center Assignment"
    | "Category Assignment";
  receivingUser: {
    id: string;
    name: string;
    email: string;
  };
  data?: NotificationData;
};

type NotificationContext = {
  categoryName?: string;
  categoryDescription?: string;

  editorEmail?: string;
  editorName?: string;

  marketCenterId?: string;
  marketCenterName?: string;

  userEmail?: string;
  userName?: string;
  userUpdate?: string;

  // ticketTitle?: string;
  [key: string]: string | undefined; // fallback for any new ones
};

function renderTemplate({
  templateContent,
  context,
}: {
  templateContent: string;
  context: NotificationContext;
}): string {
  return templateContent.replace(/{{\s*(\w+)\s*}}/g, (_, key) => {
    const value = context[key];
    return value ?? `{{${key}}}`; // fallback: leave placeholder intact if no value
  });
}

const fetchTemplate = async (templateName: string, getToken?: GetToken) => {
  console.log("Fetching template:", templateName);
  if (!getToken) {
    console.error("No auth token provided for fetching template");
    return null;
  }
  try {
    const token = await getToken();
    if (!token) {
      throw new Error("Failed to get authentication token");
    }
    const response = await fetch(
      `${API_BASE}/notifications/templates/${templateName}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );
    console.log("Fetch template response:", response);
    if (!response.ok) {
      throw new Error(
        response?.statusText
          ? response.statusText
          : "Failed to fetch notification template"
      );
    }
    const data = await response.json();
    console.log("Fetched notification template data:", data);
    if (!data || !data?.notificationTemplate) {
      throw new Error("No parsed template data");
    }
    return data?.notificationTemplate as NotificationTemplate;
  } catch (error) {
    console.error("Unable to fetch notification template:", error);
    return null;
  }
};

export const formatNotificationContent = async (
  content: NotificationContent
) => {
  let formattedNotification: CreateNotificationPayload | null = null;
  if (
    !content ||
    !content?.trigger ||
    !content?.receivingUser ||
    !content?.receivingUser?.id
  ) {
    console.error("Unable to format - Missing notification content:", content);
    return formattedNotification;
  }
  //  NO TEMPLATE NEEDED FOR NON-ACTIVITY NOTIFICATIONS
  if (content.trigger === "App Permissions") {
    return (formattedNotification = {
      userId: content?.receivingUser?.id,
      category: "PERMISSIONS",
      type: content.trigger,
      title: "Conductor Permissions",
      body: `${content?.receivingUser?.name}, let's review your notification permissions and preferences`,
      priority: "MEDIUM",
      data: {
        appPermissions: {
          email: content?.receivingUser?.email,
          name: content?.receivingUser?.name,
        },
      },
    });
  }
  if (content.trigger === "Invitation" && content?.data?.invitation) {
    return (formattedNotification = {
      userId: content?.receivingUser?.id,
      category: "ACCOUNT",
      type: "General",
      title: "Join Conductor Ticketing",
      body: `${content.data.invitation?.inviterName} invited you to Conductor Ticketing`,
      priority: "MEDIUM",
      data: { invitation: content.data.invitation as NewUserInvitationProps },
    });
  }

  if (
    content.trigger === "Account Information" &&
    content?.data?.accountInformation &&
    content?.data?.accountInformation?.updates
  ) {
    const updates = content.data.accountInformation.updates.map((update) => {
      return update.value;
    });
    return (formattedNotification = {
      userId: content?.receivingUser?.id,
      category: "ACCOUNT",
      type: content.trigger,
      title: "Account Information Updated",
      body: `${content.data.accountInformation?.changedByName} updated your following information: ${arrayToCommaSeparatedListWithConjunction("and", updates)}`,
      priority: "HIGH",
      data: { accountInformation: content.data.accountInformation },
    });
  }

  // FETCH TEMPLATE FOR ACTIVITY NOTIFICATIONS
  const template = await fetchTemplate(content.templateName, content.getToken);
  if (!template) {
    console.error("Unable to format notification - Missing template");
    return formattedNotification;
  }

  if (
    content.trigger === "Market Center Assignment" &&
    content?.data?.marketCenterAssignment
  ) {
    const context: NotificationContext = {
      editorName: content.data.marketCenterAssignment?.editorName,
      editorEmail: content.data.marketCenterAssignment?.editorEmail,
      marketCenterName: content.data.marketCenterAssignment?.marketCenterName,
      marketCenterId: content.data.marketCenterAssignment?.marketCenterId,
      userName: content.receivingUser?.name,
      userUpdate: content.data.marketCenterAssignment?.userUpdate,
    };
    const subject = renderTemplate({
      templateContent: template.subject,
      context: context,
    });
    const body = renderTemplate({
      templateContent: template.body,
      context: context,
    });

    return (formattedNotification = {
      userId: content.receivingUser.id,
      category: "ACTIVITY",
      type: content.trigger,
      title: subject,
      body: body,
      priority: "HIGH",
      data: {
        marketCenterId: content?.data?.marketCenterAssignment?.marketCenterId,
        marketCenterAssignment: content.data.marketCenterAssignment,
      },
    });
  }

  if (
    content.trigger === "Category Assignment" &&
    content?.data?.categoryAssignment
  ) {
    const categoryTemplate = await fetchTemplate(
      content.templateName,
      content.getToken
    );

    if (!categoryTemplate) {
      console.error(
        "Unable to format Category Assignment notification - Missing template"
      );
      return formattedNotification;
    }
    const context: NotificationContext = {
      editorName: content.data.categoryAssignment?.editorName,
      editorEmail: content.data.categoryAssignment?.editorEmail,
      categoryName: content.data.categoryAssignment?.categoryName,
      categoryDescription: content.data.categoryAssignment?.categoryDescription,
      marketCenterName: content.data.categoryAssignment?.marketCenterName,
      marketCenterId: content.data.categoryAssignment?.marketCenterId,
      userName: content.receivingUser?.name,
      userUpdate: content.data.categoryAssignment?.userUpdate,
    };
    const subject = renderTemplate({
      templateContent: categoryTemplate.subject,
      context: context,
    });
    const body = renderTemplate({
      templateContent: categoryTemplate.body,
      context: context,
    });

    return (formattedNotification = {
      userId: content?.receivingUser?.id,
      category: "ACTIVITY",
      type: content.trigger,
      title: subject,
      body: body,
      priority: "HIGH",
      data: { categoryAssignment: content.data.categoryAssignment },
    });
  }

  if (content.trigger === "Ticket Created" && content?.data?.createdTicket) {
    const ticketCreatedTemplate = await fetchTemplate(
      content.templateName,
      content.getToken
    );
    if (!ticketCreatedTemplate) {
      console.error(
        "Unable to format Ticket Created notification - Missing template"
      );
      return formattedNotification;
    }

    const context: NotificationContext = {
      ticketTitle: content.data.createdTicket?.ticketTitle,
      ticketNumber: content.data.createdTicket?.ticketNumber,
      creatorName: content.data.createdTicket?.creatorName,
      creatorId: content.data.createdTicket?.creatorId,
      createdOn: content.data.createdTicket?.createdOn
        ? new Date(content.data.createdTicket?.createdOn).toISOString()
        : undefined,
      dueDate: content.data.createdTicket?.dueDate
        ? new Date(content.data.createdTicket?.dueDate).toISOString()
        : undefined,
    };
    const subject = renderTemplate({
      templateContent: ticketCreatedTemplate.subject,
      context: context,
    });
    const body = renderTemplate({
      templateContent: ticketCreatedTemplate.body,
      context: context,
    });
    const assigneeId = content.data.createdTicket?.assigneeId;
    return (formattedNotification = {
      userId: content?.receivingUser?.id,
      category: "ACTIVITY",
      type: content.trigger,
      title: subject,
      body: body,
      priority: assigneeId ? "HIGH" : "MEDIUM",
      data: {
        ticketId: content.data.createdTicket?.ticketNumber,
        createdTicket: content.data.createdTicket,
      },
    });
  }

  if (
    content.trigger === "Ticket Assignment" &&
    content?.data?.ticketAssignment
  ) {
    const ticketAssignmentTemplate = await fetchTemplate(
      content.templateName,
      content.getToken
    );
    if (!ticketAssignmentTemplate) {
      console.error(
        "Unable to format Ticket Assignment notification - Missing template"
      );
      return formattedNotification;
    }
    const context: NotificationContext = {
      ticketTitle: content.data.ticketAssignment?.ticketTitle,
      ticketNumber: content.data.ticketAssignment?.ticketNumber,
      createdOn: content.data.ticketAssignment?.createdOn
        ? new Date(content.data.ticketAssignment?.createdOn).toISOString()
        : undefined,
      updatedOn: content.data.ticketAssignment?.updatedOn
        ? new Date(content.data.ticketAssignment?.updatedOn).toISOString()
        : undefined,
      editedByName: content.data.ticketAssignment?.editedByName,
      editedById: content.data.ticketAssignment?.editedById,
      updateType: content.data.ticketAssignment?.updateType,
      currentAssignment: content.data.ticketAssignment?.currentAssignment
        ? content.data.ticketAssignment?.currentAssignment?.name
        : undefined,
      previousAssignment: content.data.ticketAssignment?.previousAssignment
        ? content.data.ticketAssignment?.previousAssignment?.name
        : undefined,
    };
    const subject = renderTemplate({
      templateContent: ticketAssignmentTemplate.subject,
      context: context,
    });
    const body = renderTemplate({
      templateContent: ticketAssignmentTemplate.body,
      context: context,
    });
    return (formattedNotification = {
      userId: content?.receivingUser?.id,
      category: "ACTIVITY",
      type: content.trigger,
      title: subject,
      body: body,
      priority: "HIGH",
      data: {
        ticketId: content.data.ticketAssignment?.ticketNumber,
        userId: content.data.ticketAssignment?.editedById,
        ticketAssignment: content.data.ticketAssignment,
      },
    });
  }

  if (
    content.trigger === "Ticket Updated" &&
    content?.data?.updatedTicket &&
    content?.data?.updatedTicket?.changedDetails
  ) {
    const template = await fetchTemplate(
      content.templateName,
      content.getToken
    );
    if (!template) {
      console.error("Unable to format notification - Missing template");
      return formattedNotification;
    }
    const updates: string[] = [];
    const rawUpdates = content.data.updatedTicket
      .changedDetails as ActivityUpdates[];
    rawUpdates.forEach((update: ActivityUpdates) => {
      updates.push(update.label);
    });

    const context: NotificationContext = {
      ticketNumber: content.data.updatedTicket?.ticketNumber,
      ticketTitle: content.data.updatedTicket?.ticketTitle,
      createdOn: content.data.updatedTicket?.createdOn
        ? new Date(content.data.updatedTicket?.createdOn).toISOString()
        : undefined,
      updatedOn: content.data.updatedTicket?.updatedOn
        ? new Date(content.data.updatedTicket?.updatedOn).toISOString()
        : undefined,
      editedByName: content.data.updatedTicket?.editedByName,
      editedById: content.data.updatedTicket?.editedById,
      changedDetails: arrayToCommaSeparatedListWithConjunction("and", updates),
    };
    const subject = renderTemplate({
      templateContent: template.subject,
      context: context,
    });
    const body = renderTemplate({
      templateContent: template.body,
      context: context,
    });
    return (formattedNotification = {
      userId: content?.receivingUser?.id,
      category: "ACTIVITY",
      type: content.trigger,
      title: subject,
      body: body,
      priority: "MEDIUM",
      data: { updatedTicket: content.data.updatedTicket },
    });
  }

  return formattedNotification;
};

export async function createAndSendNotification(
  content: NotificationContent
): Promise<boolean> {
  if (!content || !content?.templateName || !content?.getToken) {
    throw new Error("Unable to format - Missing notification content");
  }
  const payload: CreateNotificationPayload | null =
    await formatNotificationContent(content);
  if (!payload || !payload?.userId)
    throw new Error("Payload not formatted correctly");
  try {
    const token = await content.getToken();
    if (!token) {
      throw new Error("Failed to get authentication token");
    }
    const response = await fetch(
      `${API_BASE}/notifications/create/${payload.userId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      }
    );
    if (!response.ok) {
      throw new Error(
        response?.statusText
          ? response.statusText
          : "Failed to create and send notification"
      );
    }

    return response.ok;
  } catch (error) {
    console.error("Unable to generate notification:", error);
    return false;
  }
}
