// import { MarketCenterSettings } from "../settings";
import { User, UserRole } from "../ticket/types";

export type InvitationStatus = "PENDING" | "ACCEPTED" | "EXPIRED" | "CANCELLED";

export interface MarketCenter {
  id: string;
  name: string;
  // settings?: MarketCenterSettings;
  createdAt: Date;
  updatedAt: Date;
  teamInvitations?: TeamInvitation[];
  ticketCategories?: TicketCategory[];
  users?: User[];
  marketCenterHistory?: MarketCenterHistory[];
  // settingsAuditLogs?: SettingsAuditLog[];
}
export interface MarketCenterHistory {
  id: string;
  marketCenterId: string;
  action: string; // create, add, remove, update, delete
  field: string; // users, name, ticketCategories
  previousValue: string;
  newValue: string;
  changedAt: Date;
  changedById: string;
  marketCenter?: MarketCenter;
  changedBy?: User;
}

export interface TeamInvitation {
  id: string;
  email: string;
  role: UserRole;
  status: InvitationStatus;
  marketCenterId?: string;
  invitedBy?: string;
  token: string;
  expiresAt: Date;
  acceptedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  marketCenter?: MarketCenter;
}

export interface TicketCategory {
  id: string;
  name: string;
  description: string | null;
  marketCenterId: string;
  defaultAssigneeId: string | null;
  createdAt: Date;
  updatedAt: Date;
  defaultAssignee?: User;
  marketCenter?: {
    id: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
    settings: {};
  };
}

// export interface SettingsAuditLog {
//   id: string;
//   marketCenterId: string;
//   userId: string;
//   action: string;
//   section: string;
//   previousValue?: {};
//   newValue?: {};
//   createdAt: Date;
//   marketCenter: MarketCenter;
//   user: User;
// }
