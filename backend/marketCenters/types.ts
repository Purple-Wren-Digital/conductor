import { User, UserRole } from "../ticket/types";

export type InvitationStatus = "PENDING" | "ACCEPTED" | "EXPIRED" | "CANCELLED";

export interface MarketCenter {
  id: string;
  name: string;
  settings?: {} | null;
  createdAt: Date;
  updatedAt: Date;
  settingsAuditLogs?: SettingsAuditLog[];
  teamInvitations?: TeamInvitation[];
  ticketCategories?: TicketCategory[];
  users?: User[];
}

export interface SettingsAuditLog {
  id: string;
  marketCenterId: string;
  userId: string;
  action: string;
  section: string;
  previousValue?: {};
  newValue?: {};
  createdAt: Date;
  marketCenter: MarketCenter;
  user: User;
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
  description?: string;
  marketCenterId: string;
  defaultAssigneeId?: string;
  createdAt: Date;
  updatedAt: Date;
  defaultAssignee?: User;
  marketCenter: MarketCenter;
}
