import { api, APIError } from "encore.dev/api";
import { db } from "../ticket/db";
import { TeamMember } from "./types";
import { getUserContext } from "../auth/user-context";
import { getUserScopeFilter } from "../auth/permissions";

export const getTeamMembers = api(
  { method: "GET", path: "/settings/team/members", auth: true },
  async (): Promise<{ members: TeamMember[]; invitations: any[] }> => {
    const userContext = await getUserContext();
    // TODO: member id

    // Only STAFF and ADMIN can view team members
    if (!userContext?.role || userContext?.role === "AGENT") {
      throw APIError.permissionDenied(
        "Insufficient permissions to view team members"
      );
    }

    // Get the user scope filter
    // const userScopeFilter = getUserScopeFilter(userContext);

    // Get active team members
    const members = await db.queryAll<{
      id: string;
      email: string;
      name: string | null;
      role: string;
      isActive: boolean;
      createdAt: Date;
    }>`
      SELECT id, email, name, role, is_active as "isActive", created_at as "createdAt"
      FROM users
      WHERE deleted_at IS NULL AND is_active = true
      ORDER BY role ASC, name ASC
    `;

    // Get pending invitations
    const invitations = await db.queryAll<{
      id: string;
      email: string;
      role: string;
      createdAt: Date;
      expiresAt: Date;
    }>`
      SELECT id, email, role, created_at as "createdAt", expires_at as "expiresAt"
      FROM team_invitations
      WHERE market_center_id = ${userContext.marketCenterId || null}
        AND status = 'PENDING'
        AND expires_at > NOW()
      ORDER BY created_at DESC
    `;
    let safeMembers: TeamMember[] | [];

    if (!members || !members.length) {
      safeMembers = [] as TeamMember[];
    } else {
      safeMembers = members.map((member) => ({
        id: member.id,
        email: member.email,
        name: member.name || "",
        role: member.role as TeamMember["role"],
        isActive: member.isActive,
        createdAt: member.createdAt,
      }));
    }

    return {
      members: safeMembers,
      invitations,
    };
  }
);
