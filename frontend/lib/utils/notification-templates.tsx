import { API_BASE } from "@/lib/api/utils";
import { NotificationTemplate } from "@/lib/types";
import { GetToken } from "@/lib/utils/notifications";
// TODO: MOVE ALL THIS TO BACKEND

export type NotificationContext = {
  assigneeId?: string;
  assigneeName?: string;
  categoryName?: string;
  categoryDescription?: string;
  changedDetails?: string;
  comment?: string;
  commenterId?: string;
  commenterName?: string;
  currentAssignment?: string;
  creatorId?: string;
  creatorName?: string;
  createdOn?: string;
  dueDate?: string;
  editorEmail?: string;
  editorName?: string;
  editorId?: string;
  isInternal?: string;
  marketCenterId?: string;
  marketCenterName?: string;
  previousAssignment?: string;

  staffName?: string;
  surveyorName?: string;

  ticketNumber?: string;
  ticketTitle?: string;

  updatedOn?: string;
  updateType?: string;
  userEmail?: string;
  userName?: string;
  userUpdate?: string;
  [key: string]: string | undefined; // fallback for any new ones
};

export function renderTemplate({
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

export const fetchTemplate = async (
  templateName: string,
  getToken?: GetToken
) => {
  if (!getToken) {
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
    if (!response.ok) {
      throw new Error(
        response?.statusText
          ? response.statusText
          : "Failed to fetch notification template"
      );
    }
    const data = await response.json();
    if (!data || !data?.notificationTemplate) {
      throw new Error("No parsed template data");
    }

    return data?.notificationTemplate as NotificationTemplate;
  } catch {
    return null;
  }
};
