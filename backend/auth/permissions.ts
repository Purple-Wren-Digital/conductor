import { APIError } from "encore.dev/api";
import type { UserContext } from "./user-context";
import { prisma } from "../ticket/db";
import { UserRole } from "../user/types";

export async function requireRole(
  userContext: UserContext,
  requiredRoles: string[]
): Promise<void> {
  if (!requiredRoles.includes(userContext.role)) {
    throw APIError.permissionDenied(
      `User does not have required role. Required: ${requiredRoles.join(
        ", "
      )}, Current: ${userContext.role}`
    );
  }
}

export async function canAccessTicket(
  userContext: UserContext,
  ticketId: string
): Promise<boolean> {
  if (userContext.role === "ADMIN") {
    return true;
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: { creator: true },
  });

  if (!ticket) {
    return false;
  }

  if (userContext.role === "AGENT") {
    return ticket.assigneeId === userContext.userId;
  }

  if (userContext.role === "STAFF") {
    if (!userContext.marketCenterId) {
      return false;
    }

    if (
      ticket.creator &&
      ticket.creator.marketCenterId === userContext.marketCenterId
    ) {
      return true;
    }

    if (ticket.assigneeId) {
      const assignee = await prisma.user.findUnique({
        where: { id: ticket.assigneeId },
      });
      if (assignee && assignee.marketCenterId === userContext.marketCenterId) {
        return true;
      }
    }

    return false;
  }

  return false;
}

export async function canModifyTicket(
  userContext: UserContext,
  ticketId: string
): Promise<boolean> {
  if (userContext.role === "ADMIN") {
    return true;
  }

  if (userContext.role === "AGENT") {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
    });
    return ticket?.assigneeId === userContext.userId;
  }

  if (userContext.role === "STAFF") {
    return await canAccessTicket(userContext, ticketId);
  }

  return false;
}

export async function canViewTicket(
  userContext: UserContext,
  ticketId: string
): Promise<boolean> {
  return canAccessTicket(userContext, ticketId);
}

export async function canUpdateTicket(
  userContext: UserContext,
  ticketId: string
): Promise<boolean> {
  return canModifyTicket(userContext, ticketId);
}

export async function canCreateTicket(
  userContext: UserContext
): Promise<boolean> {
  return userContext.role === "STAFF" || userContext.role === "ADMIN";
}

export async function canDeleteTicket(
  userContext: UserContext
): Promise<boolean> {
  return userContext.role === "STAFF" || userContext.role === "ADMIN";
}

export async function canReassignTicket(
  userContext: UserContext
): Promise<boolean> {
  return userContext.role === "STAFF" || userContext.role === "ADMIN";
}

export async function canViewInternalComments(
  userContext: UserContext
): Promise<boolean> {
  return userContext.role === "STAFF" || userContext.role === "ADMIN";
}

export async function canBeNotifiedAboutComments(
  role: UserRole,
  isInternal: boolean
): Promise<boolean> {
  if (!isInternal) {
    return true;
  }
  return role === "ADMIN" || role === "STAFF";
}

export async function canCreateInternalComments(
  userContext: UserContext
): Promise<boolean> {
  return userContext.role === "STAFF" || userContext.role === "ADMIN";
}

export async function canManageTeam(
  userContext: UserContext
): Promise<boolean> {
  return userContext.role === "ADMIN" || userContext.role === "STAFF";
}

export async function canChangeUserRoles(
  userContext: UserContext
): Promise<boolean> {
  return userContext.role === "ADMIN";
}

export async function getTicketScopeFilter(
  userContext: UserContext,
  marketCenterId?: string
) {
  if (userContext.role === "ADMIN" && !marketCenterId) {
    return {};
  }
  if (userContext.role === "ADMIN" && marketCenterId) {
    return {
      OR: [
        {
          creator: {
            marketCenterId: marketCenterId,
          },
        },
        {
          assignee: {
            marketCenterId: marketCenterId,
          },
        },
      ],
    };
  }

  if (userContext.role === "STAFF" && userContext?.marketCenterId) {
    return {
      OR: [
        {
          creator: {
            marketCenterId: userContext.marketCenterId,
          },
        },
        {
          assignee: {
            marketCenterId: userContext.marketCenterId,
          },
        },
      ],
    };
  }

  if (
    userContext.role === "AGENT" ||
    (userContext.role === "STAFF" && !userContext?.marketCenterId)
  ) {
    return { assigneeId: userContext.userId };
  }

  return { id: "impossible-id" };
}

// USERS
export async function getUserScopeFilter(userContext: UserContext) {
  if (userContext.role === "ADMIN") {
    return {};
  }

  if (userContext.role === "STAFF" && userContext.marketCenterId) {
    return { marketCenterId: userContext.marketCenterId };
  }

  return { id: userContext.userId };
}

export async function canModifyOwnProfile(
  userContext: UserContext,
  userId: string
): Promise<boolean> {
  return userContext.userId === userId;
}

export async function canModifyUsers(
  userContext: UserContext
): Promise<boolean> {
  return userContext.role === "ADMIN";
}

export async function canDeactivateUsers(
  userContext: UserContext
): Promise<boolean> {
  return userContext.role === "ADMIN";
}

// MARKET CENTERS
export async function canCreateMarketCenters(
  userContext: UserContext
): Promise<boolean> {
  return userContext.role === "ADMIN";
}

export async function canManageMarketCenters(
  userContext: UserContext
): Promise<boolean> {
  return userContext.role === "ADMIN";
}

export async function canDeleteMarketCenters(
  userContext: UserContext
): Promise<boolean> {
  return userContext.role === "ADMIN";
}

export async function marketCenterScopeFilter(
  userContext: UserContext,
  marketCenterId: string
) {
  if (userContext.role === "ADMIN") {
    return { id: marketCenterId };
  }

  if (userContext.role === "STAFF" && userContext?.marketCenterId) {
    return { id: userContext.marketCenterId };
  }

  return null;
}
