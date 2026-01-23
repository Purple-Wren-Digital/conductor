import { API_BASE } from "@/lib/api/utils";
import { CreateNotificationPayload, NotificationData } from "@/lib/types";

const standardNotifications = [
  "App Permissions",
  "Invitation",
  "Account Information",
];

const customizableNotifications = [
  "Ticket Created",
  "Ticket Updated",
  "Ticket Assignment",
  "New Comments",
  "Market Center Assignment",
  "Category Assignment",
  "Ticket Survey",
  "Ticket Survey Results",
];

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

export const formatCustomizableTemplate = async ({
  templateName,
  type,
  content,
  getToken,
}: {
  templateName: string;
  type: string;
  content: NotificationContent;
  getToken?: GetToken;
}): Promise<CreateNotificationPayload | null> => {
  if (!getToken) {
    throw new Error("getToken function is required");
  }
  if (!templateName || !type) {
    throw new Error("Template name and type are required");
  }

  if (
    !customizableNotifications.includes(templateName) ||
    !customizableNotifications.includes(type)
  ) {
    throw new Error(
      "Invalid template name or type for customizable notification"
    );
  }

  try {
    const token = await getToken();
    if (!token) {
      throw new Error("Failed to get authentication token");
    }
    const response = await fetch(
      `${API_BASE}/notifications/templates/format/${templateName}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ type: type, content: content }),
      }
    );
    if (!response.ok) {
      const errorData = await response.json();
      console.error("Customizable Template Error:", errorData);
      throw new Error(
        errorData?.message
          ? errorData.message
          : "Failed to fetch and format notification template"
      );
    }
    const data = await response.json();
    if (!data || !data?.formattedNotification) {
      throw new Error("No parsed template data");
    }

    return data?.formattedNotification as CreateNotificationPayload;
  } catch (error) {
    console.error("Unable to format notification template:", error);
    return null;
  }
};

const formatStandardNotification = async ({
  templateName,
  type,
  content,
  getToken,
}: {
  templateName: "App Permissions" | "Invitation" | "Account Information";
  type: "App Permissions" | "Invitation" | "Account Information";
  content: NotificationContent;
  getToken?: GetToken;
}): Promise<CreateNotificationPayload | null> => {
  if (!getToken) {
    throw new Error("getToken function is required");
  }
  if (!templateName || !type) {
    throw new Error("Template name and type are required");
  }

  if (
    !standardNotifications.includes(templateName) ||
    !standardNotifications.includes(type)
  ) {
    throw new Error("Invalid template name or type for standard notification");
  }

  try {
    const token = await getToken();
    if (!token) {
      throw new Error("Failed to get authentication token");
    }
    const response = await fetch(
      `${API_BASE}/notifications/templates/format/standard/${templateName}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ type: type, content: content }),
      }
    );
    if (!response.ok) {
      const errorData = await response.json();
      console.error("Standard Notification Error:", errorData);
      throw new Error(
        errorData?.message
          ? errorData.message
          : "Failed to format standard notification template"
      );
    }
    const data = await response.json();
    if (!data) {
      throw new Error("No parsed standard template data");
    }

    return data?.formattedNotification as CreateNotificationPayload;
  } catch (error) {
    console.error("Unable to format standard notification:", error);
    return null;
  }
};

export async function createAndSendNotification(
  content: NotificationContent
): Promise<boolean> {
  if (!content || !content?.templateName || !content?.getToken) {
    throw new Error("Unable to format - Missing notification content");
  }

  const isStandard =
    standardNotifications.includes(content.templateName) &&
    standardNotifications.includes(content.trigger);

  const isCustomizable =
    customizableNotifications.includes(content.templateName) &&
    customizableNotifications.includes(content.trigger);

  if (!isStandard && !isCustomizable) {
    throw new Error("Invalid templateName or trigger type");
  }

  let payload: CreateNotificationPayload | null = null;

  if (isStandard) {
    payload = await formatStandardNotification({
      templateName: content.templateName as
        | "App Permissions"
        | "Invitation"
        | "Account Information",
      type: content.trigger as
        | "App Permissions"
        | "Invitation"
        | "Account Information",
      content: content,
      getToken: content.getToken,
    });
  }
  if (isCustomizable) {
    payload = await formatCustomizableTemplate({
      templateName: content.templateName,
      type: content.trigger,
      content: content,
      getToken: content.getToken,
    });
  }

  if (!payload || !payload?.userId) {
    throw new Error("Payload not formatted correctly");
  }

  if (
    payload.email === "Notifications deactivated" &&
    payload.inApp === "Notifications deactivated"
  ) {
    console.log("Aborting... All notifications of this type are deactivated");
    return false;
  }

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
      const errorData = await response.json();
      console.error("Create notification error data", errorData);
      throw new Error(
        errorData?.message ? errorData.message : "Failed to create notification"
      );
    }

    return response.ok;
  } catch (error) {
    console.error("Error creating and sending notification:", error);
    return false;
  }
}
