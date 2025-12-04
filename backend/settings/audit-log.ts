import { api, APIError } from "encore.dev/api";
import { userRepository, settingsAuditRepository } from "./db";
import { SettingsAuditLogEntry } from "./types";

interface AuditLogFilters {
  section?: string;
  action?: string;
  limit?: number;
  offset?: number;
}

interface AuditLogResponse {
  logs: SettingsAuditLogEntry[];
  total: number;
}

export const getSettingsAuditLog = api(
  { method: "GET", path: "/settings/audit-log", auth: true },
  async (filters?: AuditLogFilters): Promise<AuditLogResponse> => {
    // TODO: Replace with proper auth
    const mockUserId = "user_1";

    // Find the user with their market center
    const user = await userRepository.findByIdWithMarketCenter(mockUserId);

    if (!user) {
      throw APIError.notFound("User not found");
    }

    // Only ADMIN users can view audit logs
    if (user.role !== "ADMIN") {
      throw APIError.permissionDenied("Only administrators can view audit logs");
    }

    if (!user.marketCenter) {
      throw APIError.notFound("Market center not found");
    }

    const { logs, total } = await settingsAuditRepository.findByMarketCenterId(
      user.marketCenter.id,
      {
        section: filters?.section,
        action: filters?.action,
        limit: filters?.limit || 50,
        offset: filters?.offset || 0,
      }
    );

    return { logs, total };
  }
);
