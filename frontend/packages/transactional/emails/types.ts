export type AssignmentUpdateType =
  | "added"
  | "removed"
  | "created"
  | "unchanged";

export type ActivityUpdates = {
  label: string;
  originalValue: string | null;
  newValue: string;
};

// USERS
export type AppPermissionsReviewProps = {
  email?: string;
  name?: string;
};

export type AccountInformationProps = {
  changedByName?: string;
  changedByEmail?: string;
  updates:
    | {
        value: "name" | "email" | "role" | "password";
        originalValue: string | null;
        newValue: string | null;
      }[]
    | null;
};

export type NewUserInvitationProps = {
  newUserName: string;
  newUserEmail: string;
  newUserRole: "AGENT" | "STAFF" | "ADMIN";
  newUserMarketCenter: string | null;
  inviterName: string;
  inviterEmail: string;
  //   inviteLink: string;
};

// MARKET CENTERS
export type MarketCenterAssignmentProps = {
  userUpdate: AssignmentUpdateType;
  marketCenterName?: string;
  marketCenterId?: string;
  userName: string;
  editorName: string;
  editorEmail: string;
};

export type CategoryAssignmentProps = {
  userUpdate: AssignmentUpdateType;
  categoryName: string;
  categoryDescription?: string;
  marketCenterName?: string;
  marketCenterId?: string;
  userName: string;
  editorName: string;
  editorEmail: string;
};

// TICKETS
export type CreatedTicketNotificationProps = {
  ticketNumber: string;
  ticketTitle: string;
  creatorName: string;
  creatorId: string;
  createdOn: Date | string;
  dueDate?: Date | string;
  assigneeId?: string;
  assigneeName?: string;
};

export type UpdatedTicketProps = {
  ticketNumber: string;
  ticketTitle: string;
  createdOn: Date | string;
  updatedOn: Date | string;
  editedByName: string;
  editedById: string;
  changedDetails: ActivityUpdates[] | string;
};

export type AssignedTicketNotificationProps = {
  ticketNumber: string;
  ticketTitle: string;
  createdOn: Date | string;
  updatedOn: Date | string;
  editedByName: string;
  editedById: string;
  updateType: AssignmentUpdateType;
  currentAssignment: { name: string; id: string } | null;
  previousAssignment: { name: string; id: string } | null;
};

// COMMENTS

export type NewCommentNotificationProps = {
  ticketNumber: string;
  ticketTitle: string;
  createdOn: Date | string;
  commenterName: string;
  commenterId: string;
  comment: string;
  isInternal: boolean;
  assignee: { name: string; id: string } | null;
};
