/**
 * Activity event types for the activity Pub/Sub topic.
 * Each backend endpoint publishes one event after its mutation succeeds.
 * The activity-notifier subscription handler determines recipients,
 * formats templates, and publishes per-user to notificationTopic.
 */

export interface TicketCreatedEvent {
  type: "ticket.created";
  ticketId: string;
  creatorId: string;
  assigneeId?: string;
  ticketTitle: string;
  urgency?: string;
  createdAt: string;
  dueDate?: string;
}

export interface TicketAssignedEvent {
  type: "ticket.assigned";
  ticketId: string;
  ticketTitle: string;
  editorId: string;
  previousAssigneeId?: string;
  newAssigneeId?: string;
}

export interface TicketUpdatedEvent {
  type: "ticket.updated";
  ticketId: string;
  ticketTitle: string;
  editorId: string;
  changedDetails: { label: string; originalValue: string; newValue: string }[];
  creatorId: string;
  assigneeId?: string;
}

export interface TicketClosedEvent {
  type: "ticket.closed";
  ticketId: string;
  ticketTitle: string;
  creatorId: string;
  creatorRole?: string;
  assigneeId?: string;
  surveyId?: string;
}

export interface TicketReopenedEvent {
  type: "ticket.reopened";
  ticketId: string;
  ticketTitle: string;
  creatorId: string;
  assigneeId?: string;
  editorId: string;
}

export interface CommentActivityEvent {
  type: "comment.created";
  ticketId: string;
  ticketTitle: string;
  commentId?: string;
  commenterId: string;
  commenterName: string;
  content: string;
  isInternal: boolean;
  assigneeId?: string;
  creatorId: string;
}

export interface SurveyCreatedEvent {
  type: "survey.created";
  ticketId: string;
  ticketTitle: string;
  creatorId: string;
  surveyorName: string;
}

export interface SurveyCompletedEvent {
  type: "survey.completed";
  ticketId: string;
  ticketTitle: string;
  assigneeId?: string;
  marketCenterId: string;
  staffName: string;
}

export interface MarketCenterUsersAddedEvent {
  type: "marketCenter.usersAdded";
  marketCenterId: string;
  marketCenterName: string;
  userIds: string[];
  editorId: string;
  editorName: string;
  editorEmail: string;
}

export interface MarketCenterUsersRemovedEvent {
  type: "marketCenter.usersRemoved";
  marketCenterId: string;
  marketCenterName: string;
  userIds: string[];
  editorId: string;
  editorName: string;
  editorEmail: string;
}

export interface CategoryAssignmentChangedEvent {
  type: "category.assignmentChanged";
  categoryId: string;
  categoryName: string;
  categoryDescription: string;
  marketCenterId: string;
  marketCenterName: string;
  oldAssigneeId?: string;
  newAssigneeId?: string;
  editorId: string;
  editorName: string;
  editorEmail: string;
}

export type ActivityEvent =
  | TicketCreatedEvent
  | TicketAssignedEvent
  | TicketUpdatedEvent
  | TicketClosedEvent
  | TicketReopenedEvent
  | CommentActivityEvent
  | SurveyCreatedEvent
  | SurveyCompletedEvent
  | MarketCenterUsersAddedEvent
  | MarketCenterUsersRemovedEvent
  | CategoryAssignmentChangedEvent;
