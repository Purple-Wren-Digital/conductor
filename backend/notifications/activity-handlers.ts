import log from "encore.dev/log";
import type {
  ActivityEvent,
  TicketCreatedEvent,
  TicketAssignedEvent,
  TicketUpdatedEvent,
  TicketClosedEvent,
  TicketReopenedEvent,
  CommentActivityEvent,
  SurveyCreatedEvent,
  SurveyCompletedEvent,
  MarketCenterUsersAddedEvent,
  MarketCenterUsersRemovedEvent,
  CategoryAssignmentChangedEvent,
} from "./activity-events";
import { notificationTopic } from "./topic";
import type { CreateNotificationRequest } from "./create";
import {
  userRepository,
  ticketRepository,
  commentRepository,
} from "../ticket/db";
import { canBeNotifiedAboutComments } from "../auth/permissions";
import {
  formatTicketCreated,
  formatTicketAssignment,
  formatTicketUpdated,
  formatNewComment,
  formatTicketClosed,
  formatTicketReopened,
  formatSurveyCreated,
  formatSurveyCompleted,
  formatMarketCenterAssignment,
  formatCategoryAssignment,
} from "./templates/format-activity";

export async function resolveAndNotify(event: ActivityEvent): Promise<void> {
  try {
    switch (event.type) {
      case "ticket.created":
        return await handleTicketCreated(event);
      case "ticket.assigned":
        return await handleTicketAssigned(event);
      case "ticket.updated":
        return await handleTicketUpdated(event);
      case "ticket.closed":
        return await handleTicketClosed(event);
      case "ticket.reopened":
        return await handleTicketReopened(event);
      case "comment.created":
        return await handleCommentCreated(event);
      case "survey.created":
        return await handleSurveyCreated(event);
      case "survey.completed":
        return await handleSurveyCompleted(event);
      case "marketCenter.usersAdded":
        return await handleMarketCenterUsersAdded(event);
      case "marketCenter.usersRemoved":
        return await handleMarketCenterUsersRemoved(event);
      case "category.assignmentChanged":
        return await handleCategoryAssignmentChanged(event);
    }
  } catch (err) {
    log.error("activity handler failed", {
      eventType: event.type,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err; // re-throw so Pub/Sub retries
  }
}

async function publishNotification(req: CreateNotificationRequest): Promise<void> {
  await notificationTopic.publish(req);
}

// --- Ticket Created ---

async function handleTicketCreated(event: TicketCreatedEvent): Promise<void> {
  const creator = await userRepository.findById(event.creatorId);
  if (!creator) return;

  // Notify creator
  const creatorNotification = formatTicketCreated(creator.id, creator.name ?? "User", event, "created");
  await publishNotification(creatorNotification);

  // Notify assignee
  if (event.assigneeId && event.assigneeId !== event.creatorId) {
    const assignee = await userRepository.findById(event.assigneeId);
    if (assignee) {
      const assigneeNotification = formatTicketAssignment(
        assignee.id,
        assignee.name ?? "User",
        {
          ticketId: event.ticketId,
          ticketTitle: event.ticketTitle,
          updateType: "added",
          currentAssignment: assignee.name ?? "User",
          previousAssignment: "Unassigned",
          editorName: creator.name ?? "User",
          editorId: creator.id,
        }
      );
      await publishNotification(assigneeNotification);
    }
  }
}

// --- Ticket Assigned ---

async function handleTicketAssigned(event: TicketAssignedEvent): Promise<void> {
  const editor = await userRepository.findById(event.editorId);
  const editorName = editor?.name ?? "User";

  // Notify old assignee (removed)
  if (event.previousAssigneeId) {
    const oldAssignee = await userRepository.findById(event.previousAssigneeId);
    if (oldAssignee) {
      const newAssigneeName = event.newAssigneeId
        ? (await userRepository.findById(event.newAssigneeId))?.name ?? "User"
        : "Unassigned";
      await publishNotification(
        formatTicketAssignment(oldAssignee.id, oldAssignee.name ?? "User", {
          ticketId: event.ticketId,
          ticketTitle: event.ticketTitle,
          updateType: "removed",
          currentAssignment: newAssigneeName,
          previousAssignment: oldAssignee.name ?? "User",
          editorName,
          editorId: event.editorId,
        })
      );
    }
  }

  // Notify new assignee (added)
  if (event.newAssigneeId) {
    const newAssignee = await userRepository.findById(event.newAssigneeId);
    if (newAssignee) {
      const prevName = event.previousAssigneeId
        ? (await userRepository.findById(event.previousAssigneeId))?.name ?? "User"
        : "Unassigned";
      await publishNotification(
        formatTicketAssignment(newAssignee.id, newAssignee.name ?? "User", {
          ticketId: event.ticketId,
          ticketTitle: event.ticketTitle,
          updateType: "added",
          currentAssignment: newAssignee.name ?? "User",
          previousAssignment: prevName,
          editorName,
          editorId: event.editorId,
        })
      );
    }
  }
}

// --- Ticket Updated ---

async function handleTicketUpdated(event: TicketUpdatedEvent): Promise<void> {
  const recipientIds = new Set<string>();

  // Notify creator
  if (event.creatorId && event.creatorId !== event.editorId) {
    recipientIds.add(event.creatorId);
  }

  // Notify assignee
  if (event.assigneeId && event.assigneeId !== event.editorId) {
    recipientIds.add(event.assigneeId);
  }

  // If nobody to notify (editor is only participant), notify editor
  if (recipientIds.size === 0) {
    recipientIds.add(event.editorId);
  }

  const editor = await userRepository.findById(event.editorId);
  const editorName = editor?.name ?? "User";

  for (const userId of recipientIds) {
    const user = await userRepository.findById(userId);
    if (!user) continue;
    await publishNotification(
      formatTicketUpdated(user.id, user.name ?? "User", {
        ticketId: event.ticketId,
        ticketTitle: event.ticketTitle,
        changedDetails: event.changedDetails,
        editorName,
        editorId: event.editorId,
      })
    );
  }
}

// --- Ticket Closed ---

async function handleTicketClosed(event: TicketClosedEvent): Promise<void> {
  // Notify creator — with survey if agent
  if (event.creatorId) {
    const creator = await userRepository.findById(event.creatorId);
    if (creator) {
      if (event.surveyId && event.creatorRole === "AGENT") {
        await publishNotification(
          formatSurveyCreated(creator.id, {
            ticketId: event.ticketId,
            ticketTitle: event.ticketTitle,
            surveyorName: creator.name ?? "User",
          })
        );
      } else {
        await publishNotification(
          formatTicketClosed(creator.id, creator.name ?? "User", event)
        );
      }
    }
  }

  // Notify assignee
  if (event.assigneeId && event.assigneeId !== event.creatorId) {
    const assignee = await userRepository.findById(event.assigneeId);
    if (assignee) {
      await publishNotification(
        formatTicketClosed(assignee.id, assignee.name ?? "User", event)
      );
    }
  }
}

// --- Ticket Reopened ---

async function handleTicketReopened(event: TicketReopenedEvent): Promise<void> {
  const recipientIds = new Set<string>();

  if (event.creatorId) recipientIds.add(event.creatorId);
  if (event.assigneeId && event.assigneeId !== event.creatorId) {
    recipientIds.add(event.assigneeId);
  }

  // Remove editor from recipients — they already know
  recipientIds.delete(event.editorId);

  // If nobody left, notify editor
  if (recipientIds.size === 0) {
    recipientIds.add(event.editorId);
  }

  for (const userId of recipientIds) {
    const user = await userRepository.findById(userId);
    if (!user) continue;
    await publishNotification(
      formatTicketReopened(user.id, user.name ?? "User", event)
    );
  }
}

// --- Comment Created ---

async function handleCommentCreated(event: CommentActivityEvent): Promise<void> {
  const recipientIds = new Set<string>();

  // Notify assignee
  if (event.assigneeId) {
    const ticket = await ticketRepository.findByIdWithRelations(event.ticketId);
    if (ticket?.assignee) {
      const canNotify = await canBeNotifiedAboutComments({
        userId: event.assigneeId,
        role: ticket.assignee.role as any,
        isInternal: event.isInternal,
        currentUserId: event.commenterId,
      });
      if (canNotify) recipientIds.add(event.assigneeId);
    }
  }

  // Notify creator
  if (event.creatorId && !recipientIds.has(event.creatorId)) {
    const ticket = await ticketRepository.findByIdWithRelations(event.ticketId);
    if (ticket?.creator) {
      const canNotify = await canBeNotifiedAboutComments({
        userId: event.creatorId,
        role: ticket.creator.role as any,
        isInternal: event.isInternal,
        currentUserId: event.commenterId,
      });
      if (canNotify) recipientIds.add(event.creatorId);
    }
  }

  // Notify previous commenters
  const previousComments = await commentRepository.findByTicketIdWithUsers(event.ticketId);
  for (const comment of previousComments) {
    const commenter = comment?.user;
    if (!commenter || recipientIds.has(commenter.id)) continue;
    const canNotify = await canBeNotifiedAboutComments({
      userId: commenter.id,
      role: commenter.role as any,
      isInternal: event.isInternal,
      currentUserId: event.commenterId,
    });
    if (canNotify) recipientIds.add(commenter.id);
  }

  for (const userId of recipientIds) {
    const user = await userRepository.findById(userId);
    if (!user) continue;
    await publishNotification(
      formatNewComment(user.id, user.name ?? "User", event)
    );
  }
}

// --- Survey Created ---

async function handleSurveyCreated(event: SurveyCreatedEvent): Promise<void> {
  if (event.creatorId) {
    const creator = await userRepository.findById(event.creatorId);
    if (creator) {
      await publishNotification(
        formatSurveyCreated(creator.id, {
          ticketId: event.ticketId,
          ticketTitle: event.ticketTitle,
          surveyorName: event.surveyorName,
        })
      );
    }
  }
}

// --- Survey Completed ---

async function handleSurveyCompleted(event: SurveyCompletedEvent): Promise<void> {
  // Notify assignee
  if (event.assigneeId) {
    const assignee = await userRepository.findById(event.assigneeId);
    if (assignee) {
      await publishNotification(
        formatSurveyCompleted(assignee.id, assignee.name ?? "User", event)
      );
    }
  }

  // Notify staff leaders in the market center
  const staffLeaders = await userRepository.findByMarketCenterIdAndRole(
    event.marketCenterId,
    "STAFF_LEADER"
  );
  for (const leader of staffLeaders) {
    if (leader.id === event.assigneeId) continue; // already notified
    await publishNotification(
      formatSurveyCompleted(leader.id, leader.name ?? "User", event)
    );
  }
}

// --- Market Center Users Added ---

async function handleMarketCenterUsersAdded(event: MarketCenterUsersAddedEvent): Promise<void> {
  for (const userId of event.userIds) {
    const user = await userRepository.findById(userId);
    if (!user) continue;
    await publishNotification(
      formatMarketCenterAssignment(user.id, user.name ?? "User", {
        marketCenterId: event.marketCenterId,
        marketCenterName: event.marketCenterName,
        updateType: "added",
        editorName: event.editorName,
        editorEmail: event.editorEmail,
      })
    );
  }
}

// --- Market Center Users Removed ---

async function handleMarketCenterUsersRemoved(event: MarketCenterUsersRemovedEvent): Promise<void> {
  for (const userId of event.userIds) {
    const user = await userRepository.findById(userId);
    if (!user) continue;
    await publishNotification(
      formatMarketCenterAssignment(user.id, user.name ?? "User", {
        marketCenterId: event.marketCenterId,
        marketCenterName: event.marketCenterName,
        updateType: "removed",
        editorName: event.editorName,
        editorEmail: event.editorEmail,
      })
    );
  }
}

// --- Category Assignment Changed ---

async function handleCategoryAssignmentChanged(event: CategoryAssignmentChangedEvent): Promise<void> {
  // Notify old assignee (removed)
  if (event.oldAssigneeId) {
    const user = await userRepository.findById(event.oldAssigneeId);
    if (user) {
      await publishNotification(
        formatCategoryAssignment(user.id, user.name ?? "User", {
          categoryName: event.categoryName,
          categoryDescription: event.categoryDescription,
          marketCenterId: event.marketCenterId,
          marketCenterName: event.marketCenterName,
          updateType: "removed",
          editorName: event.editorName,
          editorEmail: event.editorEmail,
        })
      );
    }
  }

  // Notify new assignee (added)
  if (event.newAssigneeId) {
    const user = await userRepository.findById(event.newAssigneeId);
    if (user) {
      await publishNotification(
        formatCategoryAssignment(user.id, user.name ?? "User", {
          categoryName: event.categoryName,
          categoryDescription: event.categoryDescription,
          marketCenterId: event.marketCenterId,
          marketCenterName: event.marketCenterName,
          updateType: "added",
          editorName: event.editorName,
          editorEmail: event.editorEmail,
        })
      );
    }
  }
}
