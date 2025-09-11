import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  settingsApi, 
  MarketCenterSettings, 
  SettingsUpdateRequest, 
  TeamInviteRequest, 
  UpdateMemberRoleRequest,
  AuditLogResponse,
  TeamMembersResponse,
  TicketCategoriesResponse
} from '@/lib/api/settings';

export const settingsKeys = {
  all: ['settings'] as const,
  marketCenter: () => [...settingsKeys.all, 'market-center'] as const,
  auditLog: (page?: number, limit?: number) => [...settingsKeys.all, 'audit-log', { page, limit }] as const,
  teamMembers: () => [...settingsKeys.all, 'team-members'] as const,
  ticketCategories: () => [...settingsKeys.all, 'ticket-categories'] as const,
};

export function useMarketCenterSettings() {
  return useQuery({
    queryKey: settingsKeys.marketCenter(),
    queryFn: () => settingsApi.getMarketCenterSettings(),
  });
}

export function useUpdateMarketCenterSettings() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (request: SettingsUpdateRequest) => settingsApi.updateMarketCenterSettings(request),
    onSuccess: (data) => {
      queryClient.setQueryData(settingsKeys.marketCenter(), data);
      // Invalidate audit log to show the new change
      queryClient.invalidateQueries({ queryKey: settingsKeys.auditLog() });
    },
  });
}

export function useSettingsAuditLog(page = 1, limit = 10) {
  return useQuery({
    queryKey: settingsKeys.auditLog(page, limit),
    queryFn: () => settingsApi.getAuditLog(page, limit),
  });
}

export function useListTeamMembers() {
  return useQuery({
    queryKey: settingsKeys.teamMembers(),
    queryFn: () => settingsApi.getTeamMembers(),
  });
}

export function useInviteTeamMember() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (request: TeamInviteRequest) => settingsApi.inviteTeamMember(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.teamMembers() });
    },
  });
}

export function useRemoveTeamMember() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (userId: string) => settingsApi.removeTeamMember(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.teamMembers() });
    },
  });
}

export function useUpdateTeamMemberRole() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ userId, request }: { userId: string; request: UpdateMemberRoleRequest }) => 
      settingsApi.updateTeamMemberRole(userId, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.teamMembers() });
    },
  });
}

export function useUpdateTeamMemberInformation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ userId, request }: { userId: string; request: UpdateMemberRoleRequest }) => 
      settingsApi.updateTeamMemberRole(userId, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.teamMembers() });
    },
  });
}

export function useTicketCategories() {
  return useQuery({
    queryKey: settingsKeys.ticketCategories(),
    queryFn: () => settingsApi.getTicketCategories(),
  });
}

export function useCreateTicketCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ name, defaultAssigneeId }: { name: string; defaultAssigneeId?: string }) => 
      settingsApi.createTicketCategory(name, defaultAssigneeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.ticketCategories() });
    },
  });
}

export function useUpdateTicketCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; defaultAssigneeId?: string; isActive?: boolean } }) => 
      settingsApi.updateTicketCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.ticketCategories() });
    },
  });
}

export function useDeleteTicketCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => settingsApi.deleteTicketCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.ticketCategories() });
    },
  });
}