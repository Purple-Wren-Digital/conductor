import { clientSideEnv } from "@/lib/env/client-side";
import { Environment, Local, PreviewEnv } from "./encore-client";

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

export interface MarketCenterSettings {
  businessHours: BusinessHours;
  branding: BrandingSettings;
  holidays: string[];
  integrations: {
    apiKeys: Record<string, string>;
    webhooks: {
      url: string;
      events: string[];
    }[];
  };
  general: {
    timezone: string;
    language: string;
    autoAssignment: boolean;
  };
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
  role: "AGENT" | "STAFF"| "STAFF_LEADER" | "ADMIN";
}

export interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: "AGENT" | "STAFF"| "STAFF_LEADER" | "ADMIN";
  isActive: boolean;
  createdAt: Date;
}

export interface UpdateMemberRoleRequest {
  role: "AGENT" | "STAFF"| "STAFF_LEADER" | "ADMIN";
}

export interface AuditLogResponse {
  entries: SettingsAuditLogEntry[];
  total: number;
  page: number;
  limit: number;
}

export interface TeamMembersResponse {
  members: TeamMember[];
  total: number;
}

export interface TicketCategory {
  id: string;
  name: string;
  defaultAssigneeId?: string;
  isActive: boolean;
  createdAt: Date;
}

export interface TicketCategoriesResponse {
  categories: TicketCategory[];
}

export interface SettingsExportData {
  marketCenter: {
    name: string;
    id: string;
  };
  settings: MarketCenterSettings;
  exportedAt: Date;
  version: string;
}

export interface SettingsImportRequest {
  data: SettingsExportData;
  overwriteExisting?: boolean;
}

export interface SettingsImportResponse {
  success: boolean;
  message: string;
  importedSettings: MarketCenterSettings;
}

// Get the correct encore environment
let environment = Local;
if (clientSideEnv.NEXT_PUBLIC_VERCEL_ENV === "production") {
  environment = Environment("staging");
} else if (clientSideEnv.NEXT_PUBLIC_VERCEL_ENV === "preview") {
  if (!clientSideEnv.NEXT_PUBLIC_VERCEL_GIT_PULL_REQUEST_ID) {
    throw new Error("NEXT_PUBLIC_VERCEL_GIT_PULL_REQUEST_ID is not set");
  }
  environment = PreviewEnv(
    clientSideEnv.NEXT_PUBLIC_VERCEL_GIT_PULL_REQUEST_ID
  );
}

// Note: Clerk user ID must be passed from components that use useUser() hook
async function fetchApi(path: string, clerkUserId: string, options: RequestInit = {}) {
  const response = await fetch(`${environment}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${clerkUserId}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API Error: ${response.status} - ${error}`);
  }

  return response.json();
}

export const settingsApi = {
  getMarketCenterSettings: async (clerkUserId: string): Promise<MarketCenterSettings> => {
    return fetchApi("/settings/market-center", clerkUserId);
  },

  updateMarketCenterSettings: async (
    clerkUserId: string,
    request: SettingsUpdateRequest
  ): Promise<MarketCenterSettings> => {
    return fetchApi("/settings/market-center", clerkUserId, {
      method: "PUT",
      body: JSON.stringify(request),
    });
  },

  getAuditLog: async (clerkUserId: string, page = 1, limit = 10): Promise<AuditLogResponse> => {
    return fetchApi(`/settings/audit-log?page=${page}&limit=${limit}`, clerkUserId);
  },

  getTeamMembers: async (clerkUserId: string): Promise<TeamMembersResponse> => {
    return await fetchApi("/settings/team/members", clerkUserId, {
      method: "GET",
    });
  },

  inviteTeamMember: async (
    clerkUserId: string,
    request: TeamInviteRequest
  ): Promise<{ success: boolean }> => {
    return fetchApi("/settings/team/invite", clerkUserId, {
      method: "POST",
      body: JSON.stringify(request),
    });
  },

  removeTeamMember: async (clerkUserId: string, userId: string): Promise<{ success: boolean }> => {
    return fetchApi(`/users/${userId}`, clerkUserId, {
      method: "DELETE",
      body: JSON.stringify({ id: userId }),
    });
  },

  updateTeamMemberRole: async (
    clerkUserId: string,
    userId: string,
    request: UpdateMemberRoleRequest
  ): Promise<TeamMember> => {
    return fetchApi(`/settings/team/role/${userId}`, clerkUserId, {
      method: "PUT",
      body: JSON.stringify(request),
    });
  },

  updateTeamMemberData: async (
    clerkUserId: string,
    userId: string,
    request: UpdateMemberRoleRequest
  ): Promise<TeamMember> => {
    return fetchApi(`/settings/team/member/${userId}`, clerkUserId, {
      method: "PUT",
      body: JSON.stringify(request),
    });
  },

  getTicketCategories: async (clerkUserId: string): Promise<TicketCategoriesResponse> => {
    return fetchApi("/settings/categories", clerkUserId);
  },

  createTicketCategory: async (
    clerkUserId: string,
    name: string,
    defaultAssigneeId?: string
  ): Promise<TicketCategory> => {
    return fetchApi("/settings/categories", clerkUserId, {
      method: "POST",
      body: JSON.stringify({ name, defaultAssigneeId }),
    });
  },

  updateTicketCategory: async (
    clerkUserId: string,
    id: string,
    data: { name?: string; defaultAssigneeId?: string; isActive?: boolean }
  ): Promise<TicketCategory> => {
    return fetchApi(`/settings/categories/${id}`, clerkUserId, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  deleteTicketCategory: async (clerkUserId: string, id: string): Promise<{ success: boolean }> => {
    return fetchApi(`/settings/categories/${id}`, clerkUserId, {
      method: "DELETE",
    });
  },

  exportSettings: async (clerkUserId: string): Promise<SettingsExportData> => {
    return fetchApi("/settings/export", clerkUserId);
  },

  importSettings: async (
    clerkUserId: string,
    request: SettingsImportRequest
  ): Promise<SettingsImportResponse> => {
    return fetchApi("/settings/import", clerkUserId, {
      method: "POST",
      body: JSON.stringify(request),
    });
  },
};
