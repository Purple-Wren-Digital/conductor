import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  settingsApi,
  MarketCenterSettings,
  SettingsUpdateRequest,
  TeamInviteRequest,
  UpdateMemberRoleRequest,
  AuditLogResponse,
  TeamMembersResponse,
  TicketCategoriesResponse,
  UpdateAutoCloseSettingsRequest
} from '@/lib/api/settings';

export const settingsKeys = {
  all: ['settings'] as const,
  marketCenter: () => [...settingsKeys.all, 'market-center'] as const,
  auditLog: (page?: number, limit?: number) => [...settingsKeys.all, 'audit-log', { page, limit }] as const,
  teamMembers: () => [...settingsKeys.all, 'team-members'] as const,
  ticketCategories: () => [...settingsKeys.all, 'ticket-categories'] as const,
  autoClose: (marketCenterId?: string) => [...settingsKeys.all, 'auto-close', marketCenterId] as const,
};

export function useMarketCenterSettings(clerkUserId: string | undefined) {
  return useQuery({
    queryKey: settingsKeys.marketCenter(),
    queryFn: () => {
      if (!clerkUserId) throw new Error("Not authenticated");
      return settingsApi.getMarketCenterSettings(clerkUserId);
    },
    enabled: !!clerkUserId,
  });
}

export function useUpdateMarketCenterSettings(clerkUserId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: SettingsUpdateRequest) => {
      if (!clerkUserId) throw new Error("Not authenticated");
      return settingsApi.updateMarketCenterSettings(clerkUserId, request);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(settingsKeys.marketCenter(), data);
      queryClient.invalidateQueries({ queryKey: settingsKeys.auditLog() });
    },
  });
}

export function useSettingsAuditLog(clerkUserId: string | undefined, page = 1, limit = 10) {
  return useQuery({
    queryKey: settingsKeys.auditLog(page, limit),
    queryFn: () => {
      if (!clerkUserId) throw new Error("Not authenticated");
      return settingsApi.getAuditLog(clerkUserId, page, limit);
    },
    enabled: !!clerkUserId,
  });
}

export function useListTeamMembers(clerkUserId: string | undefined) {
  return useQuery({
    queryKey: settingsKeys.teamMembers(),
    queryFn: () => {
      if (!clerkUserId) throw new Error("Not authenticated");
      return settingsApi.getTeamMembers(clerkUserId);
    },
    enabled: !!clerkUserId,
  });
}

export function useInviteTeamMember(clerkUserId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: TeamInviteRequest) => {
      if (!clerkUserId) throw new Error("Not authenticated");
      return settingsApi.inviteTeamMember(clerkUserId, request);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.teamMembers() });
    },
  });
}

export function useRemoveTeamMember(clerkUserId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => {
      if (!clerkUserId) throw new Error("Not authenticated");
      return settingsApi.removeTeamMember(clerkUserId, userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.teamMembers() });
    },
  });
}

export function useUpdateTeamMemberRole(clerkUserId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, request }: { userId: string; request: UpdateMemberRoleRequest }) => {
      if (!clerkUserId) throw new Error("Not authenticated");
      return settingsApi.updateTeamMemberRole(clerkUserId, userId, request);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.teamMembers() });
    },
  });
}

export function useUpdateTeamMemberInformation(clerkUserId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, request }: { userId: string; request: UpdateMemberRoleRequest }) => {
      if (!clerkUserId) throw new Error("Not authenticated");
      return settingsApi.updateTeamMemberRole(clerkUserId, userId, request);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.teamMembers() });
    },
  });
}

export function useTicketCategories(clerkUserId: string | undefined) {
  return useQuery({
    queryKey: settingsKeys.ticketCategories(),
    queryFn: () => {
      if (!clerkUserId) throw new Error("Not authenticated");
      return settingsApi.getTicketCategories(clerkUserId);
    },
    enabled: !!clerkUserId,
  });
}

export function useCreateTicketCategory(clerkUserId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name, defaultAssigneeId }: { name: string; defaultAssigneeId?: string }) => {
      if (!clerkUserId) throw new Error("Not authenticated");
      return settingsApi.createTicketCategory(clerkUserId, name, defaultAssigneeId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.ticketCategories() });
    },
  });
}

export function useUpdateTicketCategory(clerkUserId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; defaultAssigneeId?: string; isActive?: boolean } }) => {
      if (!clerkUserId) throw new Error("Not authenticated");
      return settingsApi.updateTicketCategory(clerkUserId, id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.ticketCategories() });
    },
  });
}

export function useDeleteTicketCategory(clerkUserId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => {
      if (!clerkUserId) throw new Error("Not authenticated");
      return settingsApi.deleteTicketCategory(clerkUserId, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.ticketCategories() });
    },
  });
}

export function useAutoCloseSettings(getToken: (() => Promise<string | null>) | undefined, marketCenterId: string | undefined) {
  return useQuery({
    queryKey: settingsKeys.autoClose(marketCenterId),
    queryFn: async () => {
      if (!getToken) throw new Error("Not authenticated");
      if (!marketCenterId) throw new Error("Market center ID required");
      const token = await getToken();
      if (!token) throw new Error("Failed to get authentication token");
      return settingsApi.getAutoCloseSettings(token, marketCenterId);
    },
    enabled: !!getToken && !!marketCenterId,
  });
}

export function useUpdateAutoCloseSettings(getToken: (() => Promise<string | null>) | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: UpdateAutoCloseSettingsRequest) => {
      if (!getToken) throw new Error("Not authenticated");
      const token = await getToken();
      if (!token) throw new Error("Failed to get authentication token");
      return settingsApi.updateAutoCloseSettings(token, request);
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(settingsKeys.autoClose(variables.marketCenterId), data);
      queryClient.invalidateQueries({ queryKey: settingsKeys.auditLog() });
    },
  });
}