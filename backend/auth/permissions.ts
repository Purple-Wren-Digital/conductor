import { APIError } from "encore.dev/api";
import type { UserContext } from "./user-context";
import { ticketRepository } from "../ticket/db";
import { Ticket } from "../ticket/types";
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

  if (userContext.role === "ADMIN" || userContext.role === "STAFF_LEADER") {
    return true;
  }

  const ticket = await ticketRepository.findByIdWithRelations(ticketId);

  if (!ticket) {
    return false;
  }

  if (
    userContext.role === "AGENT" &&
    ticket?.creatorId === userContext?.userId
  ) {
    return true;
  }

  if (
    userContext.role === "STAFF" &&
    (ticket?.category?.marketCenterId === userContext?.marketCenterId ||
      ticket?.creator?.marketCenterId === userContext?.marketCenterId ||
      ticket?.creatorId === userContext?.userId ||
      ticket?.assignee?.marketCenterId === userContext?.marketCenterId ||
      ticket?.assigneeId === userContext?.userId)
  ) {
    return true;
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
    const ticket = await ticketRepository.findById(ticketId);
    return ticket?.creatorId === userContext.userId;
  }

  if (userContext.role === "STAFF" || userContext.role === "STAFF_LEADER") {
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

export async function canCreateTicket(
  userContext?: UserContext
): Promise<boolean> {
  return userContext && userContext?.role ? true : false;
}

export async function canDeleteTicket(
  userContext: UserContext,
  ticketId: string
): Promise<boolean> {
  return await canAccessTicket(userContext, ticketId);
}

export async function canReassignTicket({
  userContext,
  newAssigneeId,
}: {
  userContext: UserContext;
  newAssigneeId?: string;
}): Promise<boolean> {
  console.log("canReassignTicket", { userContext, newAssigneeId });
  if (!newAssigneeId || !userContext?.role || userContext?.role === "AGENT") {
    return false;
  }
  if (userContext.role === "ADMIN" || userContext.role === "STAFF_LEADER") {
    return true;
  }

  if (
    userContext.role === "STAFF" &&
    (newAssigneeId === userContext?.userId || newAssigneeId === "unassigned")
  ) {
    return true;
  }

  return false;
}

export async function canViewInternalComments(
  userContext: UserContext
): Promise<boolean> {
  return (
    userContext.role === "STAFF" ||
    userContext.role === "STAFF_LEADER" ||
    userContext.role === "ADMIN"
  );
}

export async function canBeNotifiedAboutComments(
  role: UserRole,
  isInternal: boolean
): Promise<boolean> {
  if (!isInternal) {
    return true;
  }
  return role === "ADMIN" || role === "STAFF" || role === "STAFF_LEADER";
}

export async function canCreateInternalComments(
  userContext: UserContext
): Promise<boolean> {
  return (
    userContext.role === "STAFF" ||
    userContext.role === "STAFF_LEADER" ||
    userContext.role === "ADMIN"
  );
}

export async function canManageTeam(
  userContext: UserContext,
  userId?: string,
  marketCenterId?: string
): Promise<boolean> {
  if (userContext?.role === "ADMIN") {
    return true;
  }

  if (userContext?.role && userContext?.userId === userId) {
    return true;
  }

  if (
    (userContext.role === "STAFF" || userContext.role === "STAFF_LEADER") &&
    userContext?.marketCenterId &&
    marketCenterId &&
    marketCenterId === userContext.marketCenterId
  ) {
    return true;
  }

  return false;
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
  if (userContext.role === "ADMIN" && !!marketCenterId) {
    return {
      OR: [
        {
          AND: [
            { assigneeId: null },
            { category: { marketCenterId: userContext.marketCenterId } },
          ],
        },
        {
          AND: [
            { assigneeId: null },
            { creator: { marketCenterId: userContext.marketCenterId } },
          ],
        },
        { category: { marketCenterId: userContext.marketCenterId } },
        { creator: { marketCenterId: marketCenterId } },
        { assignee: { marketCenterId: marketCenterId } },
      ],
    };
  }

  if (userContext.role === "STAFF_LEADER" && !!userContext?.marketCenterId) {
    return {
      OR: [
        {
          AND: [
            { assigneeId: null },
            { category: { marketCenterId: userContext.marketCenterId } },
          ],
        },
        {
          AND: [
            { assigneeId: null },
            { creator: { marketCenterId: userContext.marketCenterId } },
          ],
        },
        { creator: { marketCenterId: userContext.marketCenterId } },
        { assignee: { marketCenterId: userContext.marketCenterId } },
        { category: { marketCenterId: userContext.marketCenterId } },
      ],
    };
  }

  if (userContext.role === "STAFF" && !!userContext?.marketCenterId) {
    return {
      OR: [
        { AND: [{ assigneeId: null }, { creatorId: userContext.userId }] },
        { assigneeId: userContext.userId },
      ],
    };
  }

  if (
    (userContext.role === "STAFF" || userContext.role === "STAFF_LEADER") &&
    !userContext?.marketCenterId
  ) {
    return {
      OR: [
        { assigneeId: userContext.userId },
        { creatorId: userContext.userId },
      ],
    };
  }

  if (userContext.role === "AGENT") {
    return { creatorId: userContext.userId };
  }

  return { id: "impossible-id" };
}

// USERS
export async function getUserScopeFilter(userContext: UserContext) {
  if (userContext.role === "ADMIN") {
    return {};
  }

  if (
    (userContext.role === "STAFF" || userContext.role === "STAFF_LEADER") &&
    userContext?.marketCenterId
  ) {
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

  if (
    (userContext.role === "STAFF" || userContext.role === "STAFF_LEADER") &&
    userContext?.marketCenterId
  ) {
    return { id: userContext.marketCenterId };
  }

  if (userContext.role === "AGENT" && userContext?.marketCenterId) {
    return { id: userContext.marketCenterId };
  }

  return null;
}
