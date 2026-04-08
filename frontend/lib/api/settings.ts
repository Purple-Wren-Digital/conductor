import { API_BASE } from "./utils";

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
  role: "AGENT" | "STAFF" | "STAFF_LEADER" | "ADMIN";
}

export interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: "AGENT" | "STAFF" | "STAFF_LEADER" | "ADMIN";
  isActive: boolean;
  createdAt: Date;
}

export interface UpdateMemberRoleRequest {
  role: "AGENT" | "STAFF" | "STAFF_LEADER" | "ADMIN";
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

export interface AutoCloseSettings {
  enabled: boolean;
  awaitingResponseDays: number;
}

export interface AutoCloseSettingsResponse {
  autoClose: AutoCloseSettings;
}

export interface UpdateAutoCloseSettingsRequest {
  marketCenterId: string;
  enabled: boolean;
  awaitingResponseDays?: number;
}

// Note: Token must be passed from components that use useAuth() hook
async function fetchApi(
  path: string,
  token: string,
  options: RequestInit = {}
) {
  if (!token) {
    throw new Error("User is not authenticated");
  }
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
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
  getMarketCenterSettings: async (
    token: string
  ): Promise<MarketCenterSettings> => {
    return fetchApi("/settings/market-center", token);
  },

  updateMarketCenterSettings: async (
    token: string,
    request: SettingsUpdateRequest
  ): Promise<MarketCenterSettings> => {
    return fetchApi("/settings/market-center", token, {
      method: "PUT",
      body: JSON.stringify(request),
    });
  },

  getAuditLog: async (
    token: string,
    page = 1,
    limit = 10
  ): Promise<AuditLogResponse> => {
    return fetchApi(`/settings/audit-log?page=${page}&limit=${limit}`, token);
  },

  getTeamMembers: async (token: string): Promise<TeamMembersResponse> => {
    return await fetchApi("/settings/team/members", token, {
      method: "GET",
    });
  },

  inviteTeamMember: async (
    token: string,
    request: TeamInviteRequest
  ): Promise<{ success: boolean }> => {
    return fetchApi("/settings/team/invite", token, {
      method: "POST",
      body: JSON.stringify(request),
    });
  },

  removeTeamMember: async (
    token: string,
    userId: string
  ): Promise<{ success: boolean }> => {
    return fetchApi(`/users/${userId}`, token, {
      method: "DELETE",
      body: JSON.stringify({ id: userId }),
    });
  },

  updateTeamMemberRole: async (
    token: string,
    userId: string,
    request: UpdateMemberRoleRequest
  ): Promise<TeamMember> => {
    return fetchApi(`/settings/team/role/${userId}`, token, {
      method: "PUT",
      body: JSON.stringify(request),
    });
  },

  updateTeamMemberData: async (
    token: string,
    userId: string,
    request: UpdateMemberRoleRequest
  ): Promise<TeamMember> => {
    return fetchApi(`/settings/team/member/${userId}`, token, {
      method: "PUT",
      body: JSON.stringify(request),
    });
  },

  getTicketCategories: async (
    token: string
  ): Promise<TicketCategoriesResponse> => {
    return fetchApi("/settings/categories", token);
  },

  createTicketCategory: async (
    token: string,
    name: string,
    defaultAssigneeId?: string
  ): Promise<TicketCategory> => {
    return fetchApi("/settings/categories", token, {
      method: "POST",
      body: JSON.stringify({ name, defaultAssigneeId }),
    });
  },

  updateTicketCategory: async (
    token: string,
    id: string,
    data: { name?: string; defaultAssigneeId?: string; isActive?: boolean }
  ): Promise<TicketCategory> => {
    return fetchApi(`/settings/categories/${id}`, token, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  deleteTicketCategory: async (
    token: string,
    id: string
  ): Promise<{ success: boolean }> => {
    return fetchApi(`/settings/categories/${id}`, token, {
      method: "DELETE",
    });
  },

  exportSettings: async (token: string): Promise<SettingsExportData> => {
    return fetchApi("/settings/export", token);
  },

  importSettings: async (
    token: string,
    request: SettingsImportRequest
  ): Promise<SettingsImportResponse> => {
    return fetchApi("/settings/import", token, {
      method: "POST",
      body: JSON.stringify(request),
    });
  },

  getAutoCloseSettings: async (
    token: string,
    marketCenterId: string
  ): Promise<AutoCloseSettingsResponse> => {
    return fetchApi(`/settings/auto-close/${marketCenterId}`, token);
  },

  updateAutoCloseSettings: async (
    token: string,
    request: UpdateAutoCloseSettingsRequest
  ): Promise<AutoCloseSettingsResponse> => {
    return fetchApi(`/settings/auto-close/${request.marketCenterId}`, token, {
      method: "PUT",
      body: JSON.stringify(request),
    });
  },
};
