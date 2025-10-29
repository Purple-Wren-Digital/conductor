export type Updates = {
  label: string;
  originalValue: string | null;
  newValue: string;
};

// USERS
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
export type MarketCenterUserUpdateProps = {
  userUpdate: "added" | "removed";
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
  createdOn: Date;
  dueDate?: Date;
};

export type EditedTicketNotificationProps = {
  ticketNumber: string;
  createdOn: Date;
  updatedOn: Date;
  editedByName: string;
  editedById: string;
  changedDetails: Updates[];
};

export type ReassignedTicketNotificationProps = {
  ticketNumber: string;
  ticketTitle: string;
  createdOn: Date;
  updatedOn: Date;
  editedByName: string;
  editedById: string;
  currentAssignment: { name: string; id: string } | null;
  previousAssignment: { name: string; id: string } | null;
};

export type QuickEditTicketNotificationProps = {
  ticketNumber: string;
  ticketTitle: string;
  createdOn: Date;
  updatedOn: Date;
  editedByName: string;
  editedById: string;
  field: string; // "urgency" or "status"
  currentData: string;
};

// COMMENTS

export type NewCommentNotificationProps = {
  ticketNumber: string;
  ticketTitle: string;
  createdOn: Date;
  commenterName: string;
  commenterId: string;
  comment: string;
  isInternal: boolean;
  assignee: { name: string; id: string } | null;
};
