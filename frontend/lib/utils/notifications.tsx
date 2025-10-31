import { API_BASE } from "@/lib/api/utils";
import { CreateNotificationPayload, NotificationData } from "@/lib/types";
import { NewUserInvitationProps } from "@/packages/transactional/emails/types";
import { arrayToCommaSeparatedListWithConjunction } from "../utils";

export type NotificationContent = {
  authToken?: string;
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

export const formatNotificationContent = (content: NotificationContent) => {
  let formattedNotification: CreateNotificationPayload | null = null;
  if (
    !content ||
    !content?.trigger ||
    !content?.receivingUser ||
    !content?.receivingUser?.id
  ) {
    console.error("Unable to format - Missing notification content");
    return formattedNotification;
  }
  if (content.trigger === "App Permissions") {
    formattedNotification = {
      userId: content.receivingUser.id,
      category: "PERMISSIONS",
      type: content.trigger,
      title: "Conductor Permissions",
      body: `${content?.receivingUser?.name}, let's review your notification permissions and preferences`,
      priority: "MEDIUM",
      data: {
        appPermissions: {
          email: content?.receivingUser?.email ?? "N/A",
          name: content?.receivingUser?.name ?? "N/A",
        },
      },
    };
  }

  if (content.trigger === "Invitation" && content?.data?.invitation) {
    formattedNotification = {
      userId: content.receivingUser.id,
      category: "PERMISSIONS",
      type: "General",
      title: "Join Conductor Ticketing",
      body: `${content.data.invitation?.inviterName} invited you to Conductor Ticketing`,
      priority: "MEDIUM",
      data: {
        invitation: content.data.invitation as NewUserInvitationProps,
      },
    };
  }

  if (
    content.trigger === "Account Information" &&
    content?.data?.accountInformation &&
    content?.data?.accountInformation?.updates
  ) {
    const updates = content.data.accountInformation.updates.map((update) => {
      return update.value;
    });
    formattedNotification = {
      userId: content.receivingUser.id,
      category: "ACCOUNT",
      type: content.trigger,
      title: "Account Details Updated",
      body: `${content.data.accountInformation?.changedByName} updated your following information: ${arrayToCommaSeparatedListWithConjunction("and", updates)}`,
      priority: "HIGH",
      data: {
        accountInformation: content.data.accountInformation,
      },
    };
  }

  if (
    content.trigger === "Market Center Assignment" &&
    content?.data?.marketCenterAssignment
  ) {
    formattedNotification = {
      userId: content.receivingUser.id,
      category: "ACTIVITY",
      type: content.trigger,
      title: content.trigger,
      body: `${content.data.marketCenterAssignment?.editorName} ${content.data.marketCenterAssignment.userUpdate === "added" ? "added you to" : "removed you from"} ${content.data.marketCenterAssignment?.marketCenterName}`,
      priority: "HIGH",
      data: {
        ...(content.data?.marketCenterAssignment?.marketCenterId && {
          marketCenterId: content.data.marketCenterAssignment.marketCenterId,
        }),
        marketCenterAssignment: content.data.marketCenterAssignment,
      },
    };
  }

  if (
    content.trigger === "Category Assignment" &&
    content?.data?.categoryAssignment
  ) {
    formattedNotification = {
      userId: content.receivingUser.id,
      category: "ACTIVITY",
      type: content.trigger,
      title: content.trigger,
      body: `You will ${content.data.categoryAssignment.userUpdate === "added" ? "now" : "no longer"} be
                automatically assigned to tickets created under ${content.data.categoryAssignment.categoryName}. Edited by: ${content.data.categoryAssignment?.editorName}`,
      priority: "HIGH",
      data: {
        marketCenterId: content.data.categoryAssignment?.marketCenterId,
        ...(content.data?.categoryAssignment?.marketCenterId && {
          marketCenterId: content.data.categoryAssignment.marketCenterId,
        }),
        categoryAssignment: content.data.categoryAssignment,
      },
    };
  }

  if (content.trigger === "Ticket Created" && content?.data?.createdTicket) {
    formattedNotification = {
      userId: content.receivingUser.id,
      category: "ACTIVITY",
      type: content.trigger,
      title: content.trigger,
      body: `"${content.data.createdTicket?.ticketTitle}" was created`,
      priority: "HIGH",
      data: {
        ticketId: content.data.createdTicket?.ticketNumber,
        ...(content.data?.createdTicket?.creatorId && {
          userId: content.data.createdTicket.creatorId,
        }),
        createdTicket: content.data.createdTicket,
      },
    };
  }

  if (
    content.trigger === "Ticket Assignment" &&
    content?.data?.ticketAssignment
  ) {
    formattedNotification = {
      userId: content.receivingUser.id,
      category: "ACTIVITY",
      type: content.trigger,
      title: content.trigger,
      body: `"${content.data.ticketAssignment?.ticketTitle}" is ${content?.data?.ticketAssignment?.updateType === "added" ? "now" : "no longer"} in your queue`,
      priority: "HIGH",
      data: {
        ticketId: content.data.ticketAssignment.ticketNumber,
        ...(content.data?.ticketAssignment?.editedById && {
          userId: content.data.ticketAssignment.editedById,
        }),
        ticketAssignment: content.data.ticketAssignment,
      },
    };
  }

  if (
    content.trigger === "Ticket Updated" &&
    content?.data?.updatedTicket &&
    content?.data?.updatedTicket?.changedDetails &&
    content?.data?.updatedTicket?.changedDetails.length > 0
  ) {
    const updates = content.data.updatedTicket.changedDetails.map((update) => {
      return update.label;
    });
    formattedNotification = {
      userId: content.receivingUser.id,
      category: "ACTIVITY",
      type: content.trigger,
      title: content.trigger,
      body: `"${content.data?.updatedTicket?.ticketTitle}": ${arrayToCommaSeparatedListWithConjunction("and", updates)}`,
      priority: "HIGH",
      data: {
        ticketId: content.data.updatedTicket?.ticketNumber,
        ...(content?.data?.updatedTicket?.editedById && {
          userId: content.data.updatedTicket.editedById,
        }),
        updatedTicket: content.data.updatedTicket,
      },
    };
  }
  console.log("Formatted Notification Content", formattedNotification);
  return formattedNotification;
};

export async function createAndSendNotification(
  content: NotificationContent
): Promise<boolean> {
  console.log("START - createAndSendNotification() - START");
  if (!content) {
    throw new Error("Unable to format - Missing notification content");
  }
  if (!content?.authToken || !content?.receivingUser?.id) {
    throw new Error("Unable to format - Missing authToken");
  }
  const payload = formatNotificationContent(content);
  if (!payload) throw new Error("Payload not formatted correctly");
  if (!payload?.userId) throw new Error("Missing users id");
  // console.log("Payload", payload);
  console.log("Final Payload JSON:", JSON.stringify(payload, null, 2));

  try {
    console.log("API BASE", API_BASE);
    const response = await fetch(`${API_BASE}/notifications/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Authorization: `Bearer ${content?.authToken}`,
      },
      body: JSON.stringify(payload),
    });
    console.log("Response - createAndSendNotification", response);
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
  } finally {
    console.log("END - createAndSendNotification()");
  }
}
