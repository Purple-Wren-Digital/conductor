import {
  MarketCenter,
  MarketCenterHistory,
  TicketCategory,
} from "../marketCenters/types";
import { Comment, TicketHistory, Ticket } from "../ticket/types";
import {
  Notification,
  NotificationCategory,
  NotificationFrequency,
} from "../notifications/types";
import { Survey } from "../surveys/types";

export type UserRole = "AGENT" | "STAFF" | "STAFF_LEADER" | "ADMIN";

export interface User {
  id: string;
  clerkId: string;
  // auth0Id: string;
  email: string;
  name: string | null; // Prisma: String? === TypeScript: string | null
  role: UserRole;
  // staffLeader: boolean;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  comments?: Comment[];

  defaultForCategories?: TicketCategory[];
  assignedTickets?: Ticket[];
  createdTickets?: Ticket[];

  marketCenterId: string | null;
  marketCenter?: MarketCenter;

  ticketHistory?: TicketHistory[];
  userHistory?: UserHistory[];
  otherUsersChanges?: UserHistory[];
  marketCenterHistory?: MarketCenterHistory[];

  userSettings?: UserSettings;
  notifications?: Notification[];

  _count?: {
    assignedTickets?: number;
    createdTickets?: number;
    comments?: number;
    defaultForCategories?: number;
  };

  responseSurveys?: Survey[];
  receivedSurveys?: Survey[];
  // averages?: SurveyResults;
}

export interface UserHistory {
  id: string;
  userId: string;
  marketCenterId: string | null;
  action: string;
  field: string | null;
  previousValue: string | null;
  newValue: string | null;
  snapshot?: {} | null; // User as they were in this moment
  changedAt: Date;
  changedById: string | null;
  changedBy?: {
    id: string;
    name: string;
    email: string;
  };
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface UserSettings {
  id: string;
  userId: string;
  notificationPreferences?: NotificationPreferences[];
  createdAt: Date;
  updatedAt: Date;
  user?: User;
}

export interface NotificationPreferences {
  id: string;
  frequency: NotificationFrequency;
  category: NotificationCategory;
  type: string;
  email: boolean;
  push: boolean;
  inApp: boolean;
  sms: boolean;
  userSettingsId: string;
  userSettings?: UserSettings;
}
