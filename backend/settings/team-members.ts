import { api, APIError } from "encore.dev/api";
import { getPrisma } from "./db";
import { TeamMember } from "./types";
import { getUserContext } from "../auth/user-context";
import { getUserScopeFilter } from "../auth/permissions";

export const getTeamMembers = api(
  { method: "GET", path: "/settings/team/members", auth: true },
  async (): Promise<{ members: TeamMember[]; invitations: any[] }> => {
    const userContext = await getUserContext();
    const prisma = getPrisma();

    // Only STAFF and ADMIN can view team members
    if (userContext.role === 'AGENT') {
      throw APIError.permissionDenied("Insufficient permissions to view team members");
    }

    // Get the user scope filter
    const userScopeFilter = getUserScopeFilter(userContext);

    // Get active team members
    const members = await prisma.user.findMany({
      where: {
        ...userScopeFilter,
        deletedAt: null,
        isActive: true
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true
      },
      orderBy: [
        { role: 'asc' },
        { name: 'asc' }
      ]
    });

    // Get pending invitations
    const invitations = await prisma.teamInvitation.findMany({
      where: {
        marketCenterId: userContext.marketCenterId || undefined,
        status: 'PENDING',
        expiresAt: {
          gt: new Date()
        }
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        expiresAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return {
      members,
      invitations
    };
  }
);