import { api, APIError } from "encore.dev/api";
import { ticketRepository, userRepository, commentRepository } from "./db";
import type { Ticket } from "./types";
import { getUserContext } from "../auth/user-context";
import { canReassignTicket } from "../auth/permissions";
import { UsersToNotify } from "../notifications/types";
import { activityTopic } from "../notifications/activity-topic";

export interface AssignTicketRequest {
  id: string;
  assigneeId: string;
}

export interface AssignTicketResponse {
  ticket: Ticket;
  usersToNotify: UsersToNotify[];
}

// Assigns a ticket to a user
export const assign = api<AssignTicketRequest, AssignTicketResponse>(
  {
    expose: true,
    method: "POST",
    path: "/tickets/:id/assign",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();

    const canReassign = await canReassignTicket({
      userContext: userContext,
      newAssigneeId: req?.assigneeId,
    });
    if (!canReassign) {
      throw APIError.permissionDenied(
        "You do not have permission to reassign tickets"
      );
    }

    const oldTicket = await ticketRepository.findByIdWithRelations(req.id);

    if (!oldTicket) {
      throw APIError.notFound("Ticket not found");
    }

    if (oldTicket && oldTicket.status === "RESOLVED") {
      throw APIError.invalidArgument(
        "Resolved tickets cannot be modified further"
      );
    }

    const unassignTicket = req.assigneeId === "Unassigned";

    // Check if assignee exists
    let newAssignee = null;

    if (!unassignTicket) {
      const user = await userRepository.findById(req.assigneeId);
      if (!user) {
        throw APIError.notFound("New assignee not found");
      }
      newAssignee = user;
    }

    const assignTicket =
      newAssignee && newAssignee?.id !== oldTicket?.assigneeId;
    const newAssigneeName = newAssignee?.name ?? "No name listed";
    const previousAssignee = oldTicket?.assignee ?? null;
    const previousAssigneeName =
      previousAssignee && previousAssignee?.name
        ? previousAssignee.name
        : previousAssignee && !previousAssignee?.name
          ? "No name listed"
          : "Unassigned";

    try {
      const updateData: any = {};

      if (unassignTicket && !!oldTicket?.assigneeId) {
        updateData.assigneeId = null;
        updateData.status = "UNASSIGNED";
      }
      if (assignTicket && !!oldTicket?.assigneeId && !!newAssignee?.id) {
        updateData.assigneeId = req.assigneeId;
        updateData.status = "ASSIGNED";
      }

      if (assignTicket && !oldTicket?.assigneeId && !!newAssignee?.id) {
        updateData.assigneeId = req.assigneeId;
        updateData.status = "ASSIGNED";
      }

      if (Object.keys(updateData).length === 0) {
        throw APIError.invalidArgument("No fields to update");
      }

      // Update ticket
      const updatedTicket = await ticketRepository.update(req.id, updateData);

      if (!updatedTicket) {
        throw APIError.notFound("ticket not found");
      }

      // Create history records
      await ticketRepository.createManyHistory([
        {
          ticketId: req.id,
          action: unassignTicket ? "REMOVE" : "ADD",
          field: "assignment",
          previousValue: unassignTicket ? previousAssigneeName : "Unassigned",
          newValue: unassignTicket ? "Unassigned" : newAssigneeName,
          snapshot: {
            ...oldTicket,
            comments: undefined,
            assignee: undefined,
            category: undefined,
            creator: undefined,
          },
          changedById: userContext.userId,
        },
        {
          ticketId: oldTicket.id,
          action: "UPDATE",
          field: "status",
          previousValue: oldTicket?.status ?? "UNASSIGNED",
          newValue: unassignTicket ? "UNASSIGNED" : "ASSIGNED",
          snapshot: {
            ...oldTicket,
            comments: undefined,
            assignee: undefined,
            category: undefined,
            creator: undefined,
          },
          changedById: userContext.userId,
        },
      ]);

      // Get updated ticket with relations
      const ticket = await ticketRepository.findByIdWithRelations(req.id);

      // Get comment count
      const comments = await commentRepository.findByTicketId(req.id);
      const commentCount = comments.length;

      const ticketWithCommentCount = {
        ...ticket!,
        commentCount,
      };

      // Publish activity event for backend notification dispatch
      await activityTopic.publish({
        type: "ticket.assigned",
        ticketId: req.id,
        ticketTitle: oldTicket.title || "",
        editorId: userContext.userId,
        previousAssigneeId: oldTicket.assigneeId ?? undefined,
        newAssigneeId: unassignTicket ? undefined : newAssignee?.id ?? undefined,
      });

      return {
        ticket: ticketWithCommentCount,
        usersToNotify: [],
      } as AssignTicketResponse;
    } catch (error: any) {
      if (error.code === "P2025") {
        throw APIError.notFound("ticket not found");
      }
      throw error;
    }
  }
);
