import { APIError } from "encore.dev/api";
import type { UserContext } from "./user-context";
import { prisma } from "../ticket/db";

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

export async function canCreateInternalComments(
  userContext: UserContext
): Promise<boolean> {
  return userContext.role === "STAFF" || userContext.role === "ADMIN";
}

export async function canManageTeam(
  userContext: UserContext
): Promise<boolean> {
  // TODO: member id for STAFF ( only can manage own team)

  return userContext.role === "STAFF" || userContext.role === "ADMIN";
}

export async function canChangeUserRoles(
  userContext: UserContext
): Promise<boolean> {
  return userContext.role === "ADMIN";
}

export function getTicketScopeFilter(userContext: UserContext) {
  if (userContext.role === "ADMIN") {
    return {};
  }

  if (userContext.role === "AGENT") {
    return { assigneeId: userContext.userId };
  }

  if (userContext.role === "STAFF" && userContext.marketCenterId) {
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

  return { id: "impossible-id" };
}

export function getUserScopeFilter(userContext: UserContext) {
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
