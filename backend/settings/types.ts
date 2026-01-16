import type { MarketCenter, TicketCategory } from "../marketCenters/types";
import {
  NotificationCategory,
  NotificationTemplate,
} from "../notifications/types";
import { TicketTemplate } from "../ticket/templates/types";

export interface MarketCenterNotificationPreferences {
  category: NotificationCategory;
  type: string;
  email: boolean;
  push: boolean;
  inApp: boolean;
  sms: boolean;
}

export interface AutoCloseSettings {
  enabled: boolean;
  awaitingResponseDays: number; // Number of business days before auto-closing. Default: 2
}

export interface MarketCenterSettings {
  notificationPreferences?: MarketCenterNotificationPreferences[];
  notificationTemplates?: NotificationTemplate[];
  ticketTemplates?: TicketTemplate[];
  marketCenter?: MarketCenter;
  autoClose?: AutoCloseSettings;

  // businessHours: BusinessHours;
  // branding: BrandingSettings;
  // holidays: string[];
  // integrations: {
  //   apiKeys: Record<string, string>;
  //   webhooks: {
  //     url: string;
  //     events: string[];
  //   }[];
  // };
  // general: {
  //   name: string;
  //   timezone: string;
  //   language: string;
  //   autoAssignment: boolean;
  // };
  // teamMembers: number;
}

export interface BusinessHours {
  monday: { start: string; end: string; isOpen: boolean };
  tuesday: { start: string; end: string; isOpen: boolean };
  wednesday: { start: string; end: string; isOpen: boolean };
  thursday: { start: string; end: string; isOpen: boolean };
  friday: { start: string; end: string; isOpen: boolean };
  saturday: { start: string; end: string; isOpen: boolean };
  sunday: { start: string; end: string; isOpen: boolean };
}

export interface BrandingSettings {
  primaryColor: string;
  logoUrl?: string;
  companyName?: string;
}

export interface SettingsUpdateRequest {
  settings: Partial<MarketCenterSettings>;
}

export interface SettingsAuditLogEntry {
  id: string;
  marketCenterId: string;
  userId: string;
  action: string;
  section: string;
  previousValue: any;
  newValue: any;
  createdAt: Date;
}

export interface TeamInviteRequest {
  email: string;
  role: "AGENT" | "STAFF" | "ADMIN";
}

export interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: "AGENT" | "STAFF" | "ADMIN";
  isActive: boolean;
  createdAt: Date;
}

export interface UpdateMemberRequest {
  role: "AGENT" | "STAFF" | "ADMIN";
}
