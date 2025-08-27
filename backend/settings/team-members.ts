import { api, APIError } from "encore.dev/api";
import { getPrisma } from "./db";
import { TeamMember } from "./types";

export const getTeamMembers = api(
  { method: "GET", path: "/settings/team/members", auth: false },
  async (): Promise<{ members: TeamMember[]; invitations: any[] }> => {
    const mockUserId = "user_1";
    const prisma = getPrisma();

    // Find the user and their market center
    const user = await prisma.user.findUnique({
      where: { id: mockUserId },
      include: { marketCenter: true }
    });

    if (!user) {
      throw APIError.notFound("User not found");
    }

    if (user.role !== 'ADMIN' && user.role !== 'STAFF') {
      throw APIError.permissionDenied("Insufficient permissions to view team members");
    }

    if (!user.marketCenter) {
      throw APIError.notFound("Market center not found");
    }

    // Get active team members
    const members = await prisma.user.findMany({
      where: {
        marketCenterId: user.marketCenterId!,
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
        marketCenterId: user.marketCenterId!,
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