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
  role: 'AGENT' | 'STAFF' | 'ADMIN';
}

export interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: 'AGENT' | 'STAFF' | 'ADMIN';
  isActive: boolean;
  createdAt: Date;
}

export interface UpdateMemberRoleRequest {
  role: 'AGENT' | 'STAFF' | 'ADMIN';
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

async function getAuthToken() {
  // In development, always use "local" token
  if (process.env.NODE_ENV === "development") {
    return "local";
  }

  // Get Auth0 access token from our API route
  const tokenResponse = await fetch("/api/auth/token");
  if (!tokenResponse.ok) {
    throw new Error("Failed to get access token");
  }
  
  const { accessToken } = await tokenResponse.json();
  return accessToken;
}

async function fetchApi(path: string, options: RequestInit = {}) {
  const token = await getAuthToken();
  const response = await fetch(`${environment}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
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
  getMarketCenterSettings: async (): Promise<MarketCenterSettings> => {
    return fetchApi('/settings/market-center');
  },

  updateMarketCenterSettings: async (request: SettingsUpdateRequest): Promise<MarketCenterSettings> => {
    return fetchApi('/settings/market-center', {
      method: 'PUT',
      body: JSON.stringify(request),
    });
  },

  getAuditLog: async (page = 1, limit = 10): Promise<AuditLogResponse> => {
    return fetchApi(`/settings/audit-log?page=${page}&limit=${limit}`);
  },

  getTeamMembers: async (): Promise<TeamMembersResponse> => {
    return fetchApi('/settings/team/members');
  },

  inviteTeamMember: async (request: TeamInviteRequest): Promise<{ success: boolean }> => {
    return fetchApi('/settings/team/invite', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  removeTeamMember: async (userId: string): Promise<{ success: boolean }> => {
    return fetchApi(`/settings/team/remove/${userId}`, {
      method: 'DELETE',
    });
  },

  updateTeamMemberRole: async (userId: string, request: UpdateMemberRoleRequest): Promise<TeamMember> => {
    return fetchApi(`/settings/team/role/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(request),
    });
  },

  getTicketCategories: async (): Promise<TicketCategoriesResponse> => {
    return fetchApi('/settings/categories');
  },

  createTicketCategory: async (name: string, defaultAssigneeId?: string): Promise<TicketCategory> => {
    return fetchApi('/settings/categories', {
      method: 'POST',
      body: JSON.stringify({ name, defaultAssigneeId }),
    });
  },

  updateTicketCategory: async (id: string, data: { name?: string; defaultAssigneeId?: string; isActive?: boolean }): Promise<TicketCategory> => {
    return fetchApi(`/settings/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteTicketCategory: async (id: string): Promise<{ success: boolean }> => {
    return fetchApi(`/settings/categories/${id}`, {
      method: 'DELETE',
    });
  },

  exportSettings: async (): Promise<SettingsExportData> => {
    return fetchApi('/settings/export');
  },

  importSettings: async (request: SettingsImportRequest): Promise<SettingsImportResponse> => {
    return fetchApi('/settings/import', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },
};