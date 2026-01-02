import { API_BASE } from "@/lib/api/utils";
import { CreateNotificationPayload, NotificationData } from "@/lib/types";

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

export const fetchAndFormatTemplate = async ({
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
  if (!templateName) {
    throw new Error("templateName is required");
  }
  if (!type) {
    throw new Error("type is required");
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
      throw new Error(
        response?.statusText
          ? response.statusText
          : "Failed to fetch and format notification template"
      );
    }
    const data = await response.json();
    if (!data || !data?.formattedNotification) {
      throw new Error("No parsed template data");
    }

    return data?.formattedNotification as CreateNotificationPayload;
  } catch (error) {
    console.error(
      "Error fetching and formatting in-app notification template:",
      error
    );
    return null;
  }
};

export async function createAndSendNotification(
  content: NotificationContent
): Promise<boolean> {
  if (!content || !content?.templateName || !content?.getToken) {
    throw new Error("Unable to format - Missing notification content");
  }
  const payload: CreateNotificationPayload | null =
    await fetchAndFormatTemplate({
      templateName: content.templateName,
      type: content.trigger,
      content: content,
      getToken: content.getToken,
    });

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
      const errorData = await response.json();
      console.error("Create and Send Notification - Failed:", errorData);
      throw new Error(
        errorData?.message
          ? errorData.message
          : "Failed to create and send notification"
      );
    }

    return response.ok;
  } catch (error) {
    console.error("Error creating and sending notification:", error);
    return false;
  }
}
