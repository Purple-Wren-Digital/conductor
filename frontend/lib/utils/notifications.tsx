import { API_BASE } from "@/lib/api/utils";
import {
  CreateNotificationPayload,
  NotificationData,
  NotificationTemplate,
} from "@/lib/types";

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
    !content?.receivingUser?.id ||
    !content?.templateName
  ) {
    console.error("Unable to format - Missing notification content:", content);
    return formattedNotification;
  }
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
      // userEmail: content.receivingUser?.email,
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

    formattedNotification = {
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
    };
  }

  // if (content.trigger === "App Permissions") {
  //   formattedNotification = {
  //     userId: content?.receivingUser?.id,
  //     category: "PERMISSIONS",
  //     type: content.trigger,
  //     title: "Conductor Permissions",
  //     body: `${content?.receivingUser?.name}, let's review your notification permissions and preferences`,
  //     priority: "MEDIUM",
  //     data: {
  //       appPermissions: {
  //         email: content?.receivingUser?.email,
  //         name: content?.receivingUser?.name,
  //       },
  //     },
  //   };
  // }
  // if (content.trigger === "Invitation" && content?.data?.invitation) {
  //   formattedNotification = {
  //     userId: content?.receivingUser?.id,
  //     category: "PERMISSIONS",
  //     type: "General",
  //     title: "Join Conductor Ticketing",
  //     body: `${content.data.invitation?.inviterName} invited you to Conductor Ticketing`,
  //     priority: "MEDIUM",
  //     data: { invitation: content.data.invitation as NewUserInvitationProps },
  //   };
  // }

  // if (
  //   content.trigger === "Account Information" &&
  //   content?.data?.accountInformation &&
  //   content?.data?.accountInformation?.updates
  // ) {
  //   const updates = content.data.accountInformation.updates.map((update) => {
  //     return update.value;
  //   });
  //   formattedNotification = {
  //     userId: content?.receivingUser?.id,
  //     category: "ACCOUNT",
  //     type: content.trigger,
  //     title: "Account Details Updated",
  //     body: `${content.data.accountInformation?.changedByName} updated your following information: ${arrayToCommaSeparatedListWithConjunction("and", updates)}`,
  //     priority: "HIGH",
  //     data: { accountInformation: content.data.accountInformation },
  //   };
  // }
  // if (
  //   content.trigger === "Category Assignment" &&
  //   content?.data?.categoryAssignment
  // ) {
  //   formattedNotification = {
  //     userId: content?.receivingUser?.id,
  //     category: "ACTIVITY",
  //     type: content.trigger,
  //     title: content.trigger,
  //     body: `You will ${content.data.categoryAssignment.userUpdate === "added" ? "now" : "no longer"} be
  //               automatically assigned to tickets created under ${content.data.categoryAssignment.categoryName}. Edited by: ${content.data.categoryAssignment?.editorName}`,
  //     priority: "HIGH",
  //     data: { categoryAssignment: content.data.categoryAssignment },
  //   };
  // }

  // if (content.trigger === "Ticket Created" && content?.data?.createdTicket) {
  //   const assigneeId = content.data.createdTicket?.assigneeId;
  //   formattedNotification = {
  //     userId: content?.receivingUser?.id,
  //     category: "ACTIVITY",
  //     type: content.trigger,
  //     title: content.trigger,
  //     body: `"${content.data.createdTicket?.ticketTitle}" was created${assigneeId ? ` and assigned.` : `. Currently, this ticket is not assigned.`}`,
  //     priority: assigneeId ? "HIGH" : "MEDIUM",
  //     data: {
  //       ticketId: content.data.createdTicket?.ticketNumber,
  //       createdTicket: content.data.createdTicket,
  //     },
  //   };
  // }

  // if (
  //   content.trigger === "Ticket Assignment" &&
  //   content?.data?.ticketAssignment
  // ) {
  //   formattedNotification = {
  //     userId: content?.receivingUser?.id,
  //     category: "ACTIVITY",
  //     type: content.trigger,
  //     title: content.trigger,
  //     body: `"${content.data.ticketAssignment?.ticketTitle}" is ${content?.data?.ticketAssignment?.updateType === "added" ? "now" : "no longer"} in your queue`,
  //     priority: "HIGH",
  //     data: {
  //       ticketId: content.data.ticketAssignment?.ticketNumber,
  //       userId: content.data.ticketAssignment?.editedById,
  //       ticketAssignment: content.data.ticketAssignment,
  //     },
  //   };
  // }
  // if (
  //   content.trigger === "Ticket Updated" &&
  //   content?.data?.updatedTicket &&
  //   content?.data?.updatedTicket?.changedDetails
  // ) {
  //   const updates = content.data.updatedTicket.changedDetails.map((update) => {
  //     return update.label;
  //   });
  //   formattedNotification = {
  //     userId: content?.receivingUser?.id,
  //     category: "ACTIVITY",
  //     type: content.trigger,
  //     title: content.trigger,
  //     body: `The following for "${content.data.updatedTicket?.ticketTitle}" was updated: ${arrayToCommaSeparatedListWithConjunction("and", updates)}`,
  //     priority: "MEDIUM",
  //     data: { updatedTicket: content.data.updatedTicket },
  //   };
  // }

  // if (
  //   content.trigger === "Ticket Assignment" &&
  //   content?.data?.ticketAssignment
  // ) {
  //   formattedNotification = {
  //     userId: content?.receivingUser?.id,
  //     category: "ACTIVITY",
  //     type: content.trigger,
  //     title: content.trigger,
  //     body: `"${content.data.ticketAssignment?.ticketTitle}" is ${content?.data?.ticketAssignment?.updateType === "added" ? "now" : "no longer"} in your queue`,
  //     priority: "HIGH",
  //     data: {
  //       ticketId: content.data.ticketAssignment?.ticketNumber,
  //       userId: content.data.ticketAssignment?.editedById,
  //       ticketAssignment: content.data.ticketAssignment,
  //     },
  //   };
  // }
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
    console.log("Creating notification with token:", token);
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
