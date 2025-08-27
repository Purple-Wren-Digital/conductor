import { api, APIError } from "encore.dev/api";
import { getPrisma } from "./db";
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
    const prisma = getPrisma();

    // TODO: Replace with proper auth
    const mockUserId = "user_1";

    // Find the user and their market center
    const user = await prisma.user.findUnique({
      where: { id: mockUserId },
      include: { marketCenter: true }
    });

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

    const where = {
      marketCenterId: user.marketCenter.id,
      ...(filters?.section && { section: filters.section }),
      ...(filters?.action && { action: filters.action })
    };

    const [logs, total] = await Promise.all([
      prisma.settingsAuditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: "desc" },
        take: filters?.limit || 50,
        skip: filters?.offset || 0
      }),
      prisma.settingsAuditLog.count({ where })
    ]);

    const formattedLogs: SettingsAuditLogEntry[] = logs.map(log => ({
      id: log.id,
      marketCenterId: log.marketCenterId,
      userId: log.userId,
      action: log.action,
      section: log.section,
      previousValue: log.previousValue,
      newValue: log.newValue,
      createdAt: log.createdAt
    }));

    return {
      logs: formattedLogs,
      total
    };
  }
);