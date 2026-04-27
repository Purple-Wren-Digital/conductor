/**
 * Template formatters for activity events.
 * Each function builds a CreateNotificationRequest using the default
 * notification templates from utils.ts. These match the payloads
 * the frontend previously constructed via createAndSendNotification().
 */

import type { CreateNotificationRequest } from "../create";
import type {
  TicketCreatedEvent,
  TicketClosedEvent,
  TicketReopenedEvent,
  CommentActivityEvent,
  SurveyCompletedEvent,
} from "../activity-events";
import {
  notificationTemplatesDefault,
  renderTemplate,
} from "./utils";

function getDefaultTemplate(type: string) {
  return notificationTemplatesDefault.find((t) => t.type === type);
}

function toSnakeCase(obj: Record<string, any>) {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [
      key.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`),
      value,
    ])
  );
}

function renderFromTemplate(
  type: string,
  context: Record<string, string | undefined>
): { title: string; body: string } {
  const template = getDefaultTemplate(type);
  if (!template) {
    return { title: type, body: "" };
  }
  const variables = Object.values(template.variables || {}).map((v: string) =>
    v.replace(/[{}]/g, "")
  );
  const snakeContext = toSnakeCase(context);
  return {
    title: renderTemplate({
      templateContent: template.subject,
      variables,
      data: snakeContext,
    }),
    body: renderTemplate({
      templateContent: template.body,
      variables,
      data: snakeContext,
    }),
  };
}

// --- Ticket Created ---

export function formatTicketCreated(
  recipientId: string,
  recipientName: string,
  event: TicketCreatedEvent,
  updateType: string
): CreateNotificationRequest {
  const rendered = renderFromTemplate("Ticket Created", {
    ticketNumber: event.ticketId,
    ticketTitle: event.ticketTitle,
    creatorName: recipientName,
    creatorId: event.creatorId,
    createdOn: event.createdAt,
    dueDate: event.dueDate,
    userName: recipientName,
  });

  return {
    userId: recipientId,
    category: "ACTIVITY",
    type: "Ticket Created",
    email: rendered,
    inApp: rendered,
    priority: event.assigneeId ? "HIGH" : "MEDIUM",
    data: {
      ticketId: event.ticketId,
      createdTicket: {
        ticketNumber: event.ticketId,
        ticketTitle: event.ticketTitle,
        creatorName: recipientName,
        creatorId: event.creatorId,
        createdOn: event.createdAt,
        dueDate: event.dueDate,
        userName: recipientName,
      },
    },
  };
}

// --- Ticket Assignment ---

export function formatTicketAssignment(
  recipientId: string,
  recipientName: string,
  params: {
    ticketId: string;
    ticketTitle: string;
    updateType: string;
    currentAssignment: string;
    previousAssignment: string;
    editorName: string;
    editorId: string;
  }
): CreateNotificationRequest {
  const rendered = renderFromTemplate("Ticket Assignment", {
    ticketNumber: params.ticketId,
    ticketTitle: params.ticketTitle,
    updateType: params.updateType,
    currentAssignment: params.currentAssignment,
    previousAssignment: params.previousAssignment,
    editorName: params.editorName,
    editorId: params.editorId,
    userName: recipientName,
  });

  return {
    userId: recipientId,
    category: "ACTIVITY",
    type: "Ticket Assignment",
    email: rendered,
    inApp: rendered,
    priority: "HIGH",
    data: {
      ticketId: params.ticketId,
      ticketAssignment: {
        ticketNumber: params.ticketId,
        ticketTitle: params.ticketTitle,
        createdOn: new Date().toISOString(),
        updatedOn: new Date().toISOString(),
        updateType: params.updateType as any,
        currentAssignment: params.currentAssignment,
        previousAssignment: params.previousAssignment,
        editorName: params.editorName,
        editorId: params.editorId,
        userName: recipientName,
      },
    },
  };
}

// --- Ticket Updated ---

export function formatTicketUpdated(
  recipientId: string,
  recipientName: string,
  params: {
    ticketId: string;
    ticketTitle: string;
    changedDetails: { label: string; originalValue: string; newValue: string }[];
    editorName: string;
    editorId: string;
  }
): CreateNotificationRequest {
  const changedLabels = params.changedDetails.map((d) =>
    d.label.charAt(0).toUpperCase() + d.label.slice(1).toLowerCase()
  );
  const changedDetailsStr =
    changedLabels.length > 1
      ? changedLabels.slice(0, -1).join(", ") + " and " + changedLabels.slice(-1)
      : changedLabels[0] || "";

  const rendered = renderFromTemplate("Ticket Updated", {
    ticketNumber: params.ticketId,
    ticketTitle: params.ticketTitle,
    changedDetails: changedDetailsStr,
    editorName: params.editorName,
    editorId: params.editorId,
    userName: recipientName,
  });

  return {
    userId: recipientId,
    category: "ACTIVITY",
    type: "Ticket Updated",
    email: rendered,
    inApp: rendered,
    priority: "MEDIUM",
    data: {
      ticketId: params.ticketId,
      updatedTicket: {
        ticketNumber: params.ticketId,
        ticketTitle: params.ticketTitle,
        createdOn: new Date().toISOString(),
        updatedOn: new Date().toISOString(),
        changedDetails: params.changedDetails,
        editorName: params.editorName,
        editorId: params.editorId,
        userName: recipientName,
      },
    },
  };
}

// --- Ticket Closed ---

export function formatTicketClosed(
  recipientId: string,
  recipientName: string,
  event: TicketClosedEvent
): CreateNotificationRequest {
  const rendered = renderFromTemplate("Ticket Updated", {
    ticketNumber: event.ticketId,
    ticketTitle: event.ticketTitle,
    changedDetails: "Status",
    userName: recipientName,
  });

  return {
    userId: recipientId,
    category: "ACTIVITY",
    type: "Ticket Updated",
    email: rendered,
    inApp: rendered,
    priority: "MEDIUM",
    data: {
      ticketId: event.ticketId,
      updatedTicket: {
        ticketNumber: event.ticketId,
        ticketTitle: event.ticketTitle,
        createdOn: new Date().toISOString(),
        updatedOn: new Date().toISOString(),
        editorName: recipientName,
        editorId: "",
        changedDetails: [
          { label: "status", originalValue: "Open", newValue: "RESOLVED" },
        ],
        userName: recipientName,
      },
    },
  };
}

// --- Ticket Reopened ---

export function formatTicketReopened(
  recipientId: string,
  recipientName: string,
  event: TicketReopenedEvent
): CreateNotificationRequest {
  const rendered = renderFromTemplate("Ticket Updated", {
    ticketNumber: event.ticketId,
    ticketTitle: event.ticketTitle,
    changedDetails: "Status",
    userName: recipientName,
  });

  return {
    userId: recipientId,
    category: "ACTIVITY",
    type: "Ticket Updated",
    email: rendered,
    inApp: rendered,
    priority: "MEDIUM",
    data: {
      ticketId: event.ticketId,
      updatedTicket: {
        ticketNumber: event.ticketId,
        ticketTitle: event.ticketTitle,
        createdOn: new Date().toISOString(),
        updatedOn: new Date().toISOString(),
        editorName: event.editorId,
        editorId: event.editorId,
        changedDetails: [
          { label: "status", originalValue: "RESOLVED", newValue: "IN_PROGRESS" },
        ],
        userName: recipientName,
      },
    },
  };
}

// --- New Comment ---

export function formatNewComment(
  recipientId: string,
  recipientName: string,
  event: CommentActivityEvent
): CreateNotificationRequest {
  const truncatedContent =
    event.content.length > 100
      ? event.content.substring(0, 100) + "..."
      : event.content;

  const rendered = renderFromTemplate("New Comments", {
    ticketNumber: event.ticketId,
    ticketTitle: event.ticketTitle,
    commenterName: event.commenterName,
    commenterId: event.commenterId,
    comment: truncatedContent,
    isInternal: event.isInternal ? "Internal" : "External",
    userName: recipientName,
  });

  return {
    userId: recipientId,
    category: "ACTIVITY",
    type: "New Comments",
    email: rendered,
    inApp: rendered,
    priority: "MEDIUM",
    data: {
      ticketId: event.ticketId,
      newComment: {
        ticketNumber: event.ticketId,
        ticketTitle: event.ticketTitle,
        createdOn: new Date().toISOString(),
        commenterName: event.commenterName,
        commenterId: event.commenterId,
        comment: truncatedContent,
        isInternal: event.isInternal,
        userName: recipientName,
      },
    },
  };
}

// --- Survey Created ---

export function formatSurveyCreated(
  recipientId: string,
  params: {
    ticketId: string;
    ticketTitle: string;
    surveyorName: string;
  }
): CreateNotificationRequest {
  const rendered = renderFromTemplate("Ticket Survey", {
    ticketNumber: params.ticketId,
    ticketTitle: params.ticketTitle,
    surveyorName: params.surveyorName,
  });

  return {
    userId: recipientId,
    category: "ACTIVITY",
    type: "Ticket Survey",
    email: rendered,
    inApp: rendered,
    priority: "MEDIUM",
    data: {
      ticketId: params.ticketId,
      ticketSurvey: {
        ticketNumber: params.ticketId,
        ticketTitle: params.ticketTitle,
        surveyorName: params.surveyorName,
      },
    },
  };
}

// --- Survey Completed ---

export function formatSurveyCompleted(
  recipientId: string,
  recipientName: string,
  event: SurveyCompletedEvent
): CreateNotificationRequest {
  const rendered = renderFromTemplate("Ticket Survey Results", {
    ticketNumber: event.ticketId,
    ticketTitle: event.ticketTitle,
    staffName: event.staffName,
    userName: recipientName,
  });

  return {
    userId: recipientId,
    category: "ACTIVITY",
    type: "Ticket Survey Results",
    email: rendered,
    inApp: rendered,
    priority: "MEDIUM",
    data: {
      ticketId: event.ticketId,
      surveyResults: {
        ticketNumber: event.ticketId,
        ticketTitle: event.ticketTitle,
        staffName: event.staffName,
        userName: recipientName,
      },
    },
  };
}

// --- Market Center Assignment ---

export function formatMarketCenterAssignment(
  recipientId: string,
  recipientName: string,
  params: {
    marketCenterId: string;
    marketCenterName: string;
    updateType: "added" | "removed";
    editorName: string;
    editorEmail: string;
  }
): CreateNotificationRequest {
  const rendered = renderFromTemplate("Market Center Assignment", {
    marketCenterName: params.marketCenterName,
    marketCenterId: params.marketCenterId,
    userUpdate: params.updateType,
    editorName: params.editorName,
    editorEmail: params.editorEmail,
    userName: recipientName,
  });

  return {
    userId: recipientId,
    category: "ACTIVITY",
    type: "Market Center Assignment",
    email: rendered,
    inApp: rendered,
    priority: "HIGH",
    data: {
      marketCenterId: params.marketCenterId,
      marketCenterAssignment: {
        marketCenterId: params.marketCenterId,
        marketCenterName: params.marketCenterName,
        userUpdate: params.updateType,
        editorName: params.editorName,
        editorEmail: params.editorEmail,
        userName: recipientName,
      },
    },
  };
}

// --- Category Assignment ---

export function formatCategoryAssignment(
  recipientId: string,
  recipientName: string,
  params: {
    categoryName: string;
    categoryDescription: string;
    marketCenterId: string;
    marketCenterName: string;
    updateType: "added" | "removed";
    editorName: string;
    editorEmail: string;
  }
): CreateNotificationRequest {
  const rendered = renderFromTemplate("Category Assignment", {
    categoryName: params.categoryName,
    categoryDescription: params.categoryDescription,
    marketCenterName: params.marketCenterName,
    marketCenterId: params.marketCenterId,
    userUpdate: params.updateType,
    editorName: params.editorName,
    editorEmail: params.editorEmail,
    userName: recipientName,
  });

  return {
    userId: recipientId,
    category: "ACTIVITY",
    type: "Category Assignment",
    email: rendered,
    inApp: rendered,
    priority: "HIGH",
    data: {
      categoryAssignment: {
        categoryName: params.categoryName,
        categoryDescription: params.categoryDescription,
        marketCenterName: params.marketCenterName,
        marketCenterId: params.marketCenterId,
        userUpdate: params.updateType,
        editorName: params.editorName,
        editorEmail: params.editorEmail,
        userName: recipientName,
      },
    },
  };
}
