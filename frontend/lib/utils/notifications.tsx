import { API_BASE } from "@/lib/api/utils";
import { CreateNotificationPayload, NotificationData } from "@/lib/types";
import { arrayToCommaSeparatedListWithConjunction } from "@/lib/utils";
import {
  fetchTemplate,
  NotificationContext,
  renderTemplate,
} from "@/lib/utils/notification-templates";
import {
  ActivityUpdates,
  NewUserInvitationProps,
} from "@/packages/transactional/emails/types";

// TODO: MOVE ALL THIS TO BACKEND

export type GetTokenOptions = {
  template?: string | undefined;
  organizationId?: string | undefined;
  leewayInSeconds?: number | undefined;
  skipCache?: boolean | undefined;
};

export type GetToken = (options?: GetTokenOptions) => Promise<string | null>;

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
    | "Category Assignment"
    | "Ticket Survey"
    | "Ticket Survey Results";
  receivingUser: {
    id: string;
    name: string;
    email: string;
  };
  data?: NotificationData;
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
      editorName: content.data.ticketAssignment?.editorName,
      editorId: content.data.ticketAssignment?.editorId,
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
        userId: content.data.ticketAssignment?.editorId,
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
      return formattedNotification;
    }
    const updates: string[] = [];
    const rawChangedDetails = content.data.updatedTicket?.changedDetails;

    if (
      rawChangedDetails &&
      Array.isArray(rawChangedDetails) &&
      typeof rawChangedDetails[0] === "object" &&
      typeof rawChangedDetails[0] !== "string" &&
      "label" in rawChangedDetails[0]
    ) {
      rawChangedDetails.map((update: ActivityUpdates) => {
        updates.push(update.label);
      });
    }

    const context: NotificationContext = {
      ticketNumber: content.data.updatedTicket?.ticketNumber,
      ticketTitle: content.data.updatedTicket?.ticketTitle,
      createdOn: content.data.updatedTicket?.createdOn
        ? new Date(content.data.updatedTicket?.createdOn).toISOString()
        : undefined,
      updatedOn: content.data.updatedTicket?.updatedOn
        ? new Date(content.data.updatedTicket?.updatedOn).toISOString()
        : undefined,
      editorName: content.data.updatedTicket?.editorName,
      editorId: content.data.updatedTicket?.editorId,
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
  if (content.trigger === "New Comments" && content?.data?.newComment) {
    const newCommentTemplate = await fetchTemplate(
      content.templateName,
      content.getToken
    );
    if (!newCommentTemplate) {
      return formattedNotification;
    }

    const context: NotificationContext = {
      ticketNumber: content.data.newComment?.ticketNumber,
      ticketTitle: content.data.newComment?.ticketTitle,
      creatorName: content.data.newComment?.commenterName,
      creatorId: content.data.newComment?.commenterId,
      createdOn: content.data.newComment?.createdOn
        ? new Date(content.data.newComment?.createdOn).toISOString()
        : undefined,
      comment: content.data.newComment?.comment,
      isInternal: content.data.newComment?.isInternal ? "Internal" : "External",
    };
    const subject = renderTemplate({
      templateContent: newCommentTemplate.subject,
      context: context,
    });
    const body = renderTemplate({
      templateContent: newCommentTemplate.body,
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

  if (content.trigger === "Ticket Survey" && content?.data?.ticketSurvey) {
    const ticketSurveyTemplate = await fetchTemplate(
      content.templateName,
      content.getToken
    );

    if (!ticketSurveyTemplate) {
      return formattedNotification;
    }
    const context: NotificationContext = {
      ticketNumber: content.data.ticketSurvey?.ticketNumber,
      ticketTitle: content.data.ticketSurvey?.ticketTitle,
      surveyorName: content.data.ticketSurvey?.surveyorName,
    };
    const subject = renderTemplate({
      templateContent: ticketSurveyTemplate.subject,
      context: context,
    });
    const body = renderTemplate({
      templateContent: ticketSurveyTemplate.body,
      context: context,
    });

    return (formattedNotification = {
      userId: content?.receivingUser?.id,
      category: "ACTIVITY",
      type: content.trigger,
      title: subject,
      body: body,
      priority: "MEDIUM",
      data: { ticketSurvey: content.data.ticketSurvey },
    });
  }

  if (
    content.trigger === "Ticket Survey Results" &&
    content?.data?.surveyResults
  ) {
    const surveyResultsTemplate = await fetchTemplate(
      content.templateName,
      content.getToken
    );

    if (!surveyResultsTemplate) {
      return formattedNotification;
    }
    const context: NotificationContext = {
      ticketNumber: content.data.surveyResults?.ticketNumber,
      ticketTitle: content.data.surveyResults?.ticketTitle,
      staffName: content.data.surveyResults?.staffName,
    };
    const subject = renderTemplate({
      templateContent: surveyResultsTemplate.subject,
      context: context,
    });
    const body = renderTemplate({
      templateContent: surveyResultsTemplate.body,
      context: context,
    });

    return (formattedNotification = {
      userId: content?.receivingUser?.id,
      category: "ACTIVITY",
      type: content.trigger,
      title: subject,
      body: body,
      priority: "MEDIUM",
      data: { surveyResults: content.data.surveyResults },
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
    console.error("Error creating and sending notification:", error);
    return false;
  }
}
