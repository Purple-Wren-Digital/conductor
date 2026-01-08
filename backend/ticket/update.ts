import { api, APIError } from "encore.dev/api";
import {
  ticketRepository,
  userRepository,
  marketCenterRepository,
  surveyRepository,
  todoRepository,
  withTransaction,
} from "./db";
import type { Ticket, TicketStatus, Urgency } from "./types";
import { getUserContext } from "../auth/user-context";
import {
  canDeleteTicket,
  canModifyTicket,
  canReassignTicket,
} from "../auth/permissions";
import { ActivityUpdates } from "@/emails/types";
import { UsersToNotify } from "../notifications/types";
import { slaService } from "../sla/sla.service";

export interface UpdateTicketRequest {
  ticketId: string;
  title?: string;
  description?: string;
  status?: TicketStatus;
  urgency?: Urgency;
  categoryId?: string;
  dueDate?: Date;
  assigneeId?: string;
  todos?: string[];
}

export interface UpdateTicketResponse {
  ticket: Ticket;
  usersToNotify: UsersToNotify[];
  changedDetails: ActivityUpdates[];
}

export const update = api<UpdateTicketRequest, UpdateTicketResponse>(
  {
    expose: true,
    method: "PUT",
    path: "/tickets/update/:ticketId",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();

    const canModify = await canModifyTicket(userContext, req.ticketId);
    if (!canModify) {
      throw APIError.permissionDenied(
        "You do not have permission to modify this ticket"
      );
    }

    const canAssign = await canReassignTicket({
      userContext: userContext,
      newAssigneeId: req?.assigneeId,
    });

    const oldTicket = await ticketRepository.findByIdWithRelations(
      req.ticketId
    );
    if (!oldTicket || !oldTicket?.creatorId) {
      throw APIError.notFound("Ticket not found");
    }

    if (oldTicket && oldTicket.status === "RESOLVED") {
      throw APIError.invalidArgument(
        "Resolved tickets cannot be modified further"
      );
    }

    const unassignTicket = req.assigneeId === "Unassigned";

    // Check if assignee exists and is in the same market center for STAFF users
    let newAssignee = null;
    if (canAssign && req.assigneeId && !unassignTicket) {
      const user = await userRepository.findById(req.assigneeId);
      if (!user) {
        throw APIError.notFound("New assignee not found");
      }
      newAssignee = user;
    }

    if (
      (userContext.role === "STAFF" || userContext.role === "STAFF_LEADER") &&
      req.assigneeId &&
      !canAssign
    ) {
      throw APIError.permissionDenied(
        "You can only assign tickets to users in your team"
      );
    }

    const marketCenterId =
      oldTicket.assignee?.marketCenterId ||
      oldTicket.category?.marketCenterId ||
      oldTicket.creator?.marketCenterId ||
      null;

    // CLOSE TICKET FIRST
    if (req?.status && req.status === "RESOLVED") {
      const canClose = await canDeleteTicket(userContext, req.ticketId);
      if (!canClose) {
        throw APIError.permissionDenied(
          "You do not have permission to close this ticket"
        );
      }

      let surveyId: string | null = null;

      if (!marketCenterId) {
        throw APIError.notFound("Market Center not found");
      }

      if (oldTicket?.creator?.role === "AGENT") {
        const survey = await surveyRepository.findOrCreate({
          ticketId: req.ticketId,
          surveyorId: oldTicket.creatorId!,
          assigneeId: oldTicket.assigneeId || null,
          marketCenterId: marketCenterId,
        });
        if (!survey || !survey?.id) {
          throw APIError.internal("Failed to find or create ticket survey");
        }
        surveyId = survey.id;
      }

      // Update ticket status to resolved
      await ticketRepository.update(req.ticketId, {
        status: "RESOLVED",
        resolvedAt: new Date(),
        surveyId: surveyId,
      });

      await slaService.recordResolution(req.ticketId);

      const closedTicket = await ticketRepository.findByIdWithRelations(
        req.ticketId
      );
      if (!closedTicket) {
        throw APIError.notFound("Ticket not found after closing");
      }

      await ticketRepository.createHistory({
        ticketId: req.ticketId,
        action: "CLOSE",
        field: "ticket",
        previousValue: oldTicket.status,
        newValue: "RESOLVED",
        snapshot: oldTicket as any,
        changedById: userContext.userId,
      });

      return {
        ticket: closedTicket,
        usersToNotify: [
          {
            id: closedTicket.creatorId,
            name: closedTicket.creator?.name || "",
            email: closedTicket.creator?.email || "",
            updateType: surveyId ? "ticketSurvey" : "unchanged",
          },
          oldTicket?.assigneeId &&
          oldTicket?.assignee &&
          oldTicket.creatorId !== oldTicket?.assigneeId
            ? {
                id: oldTicket.assigneeId,
                name: oldTicket.assignee?.name || "",
                email: oldTicket.assignee?.email || "",
                updateType: "unchanged",
              }
            : undefined,
        ].filter(Boolean) as UsersToNotify[],
        changedDetails: [
          {
            label: "status",
            originalValue: oldTicket.status,
            newValue: "RESOLVED",
          },
        ],
      };
    }

    // UPDATE OTHER TICKET FIELDS IF NOT CLOSING

    const updateData: Partial<{
      title: string | null;
      description: string | null;
      status: TicketStatus;
      urgency: Urgency;
      categoryId: string | null;
      dueDate: Date | null;
      assigneeId: string | null;
      resolvedAt: Date | null;
      surveyId: string | null;
    }> = {};
    let ticketHistoryData: Array<{
      ticketId: string;
      action: string;
      field: string | null;
      previousValue: string | null;
      newValue: string | null;
      snapshot: any;
      changedById: string;
    }> = [];
    let usersToNotify: UsersToNotify[] = [];

    if (
      req?.status &&
      req.status !== "RESOLVED" &&
      req.status !== oldTicket.status
    ) {
      updateData.status = req.status;
      ticketHistoryData.push({
        ticketId: req.ticketId,
        action: "UPDATE",
        field: "status",
        previousValue: oldTicket.status,
        newValue: req.status,
        snapshot: oldTicket,
        changedById: userContext.userId,
      });
    }

    if (req?.title && req.title !== oldTicket.title) {
      updateData.title = req.title;
      ticketHistoryData.push({
        ticketId: req.ticketId,
        action: "UPDATE",
        field: "title",
        previousValue: oldTicket?.title ?? null,
        newValue: req?.title ?? null,
        snapshot: oldTicket,
        changedById: userContext.userId,
      });
    }
    if (req?.description && req.description !== oldTicket.description) {
      updateData.description = req.description;
      ticketHistoryData.push({
        ticketId: req.ticketId,
        action: "UPDATE",
        field: "description",
        previousValue: oldTicket?.description ?? null,
        newValue: req?.description ?? null,
        snapshot: oldTicket,
        changedById: userContext.userId,
      });
    }
    if (req?.urgency && req.urgency !== oldTicket.urgency) {
      updateData.urgency = req.urgency;
      ticketHistoryData.push({
        ticketId: req.ticketId,
        action: "UPDATE",
        field: "urgency",
        previousValue: oldTicket.urgency,
        newValue: req.urgency,
        snapshot: oldTicket,
        changedById: userContext.userId,
      });
    }
    if (req?.categoryId && req.categoryId !== oldTicket.categoryId) {
      const newCategory = await marketCenterRepository.findCategoryById(
        req.categoryId
      );
      updateData.categoryId = req.categoryId;
      ticketHistoryData.push({
        ticketId: req.ticketId,
        action: "UPDATE",
        field: "category",
        previousValue: oldTicket?.category?.name ?? null,
        newValue: newCategory?.name ?? null,
        snapshot: oldTicket,
        changedById: userContext.userId,
      });
    }
    if (req?.dueDate) {
      const oldTime = oldTicket.dueDate ? oldTicket.dueDate.getTime() : null;
      const newTime = req.dueDate ? req.dueDate.getTime() : null;
      if (oldTime !== newTime) {
        updateData.dueDate = req.dueDate;
        ticketHistoryData.push({
          ticketId: req.ticketId,
          action: "UPDATE",
          field: "dueDate",
          previousValue: oldTicket.dueDate
            ? oldTicket.dueDate.toISOString()
            : null,
          newValue: req.dueDate ? req.dueDate.toISOString() : null,
          snapshot: oldTicket,
          changedById: userContext.userId,
        });
      }
    }

    // ASSIGNMENT CHANGES
    const reassignTicket =
      newAssignee && newAssignee?.id !== oldTicket?.assigneeId;
    const previousAssignee = oldTicket?.assignee ?? null;
    const previousAssigneeName =
      previousAssignee && previousAssignee?.name
        ? previousAssignee.name
        : previousAssignee && !previousAssignee?.name
          ? "No name listed"
          : "Unassigned";

    if (canAssign && unassignTicket && !!oldTicket?.assigneeId) {
      updateData.assigneeId = null;
      updateData.status = "UNASSIGNED";
      usersToNotify.push({
        id: oldTicket.assigneeId,
        name: previousAssigneeName,
        email: previousAssignee?.email ?? "N/a",
        updateType: "removed",
      });

      ticketHistoryData.push(
        {
          ticketId: req.ticketId,
          action: "REMOVE",
          field: "assignment",
          previousValue: previousAssigneeName,
          newValue: "Unassigned",
          snapshot: oldTicket,
          changedById: userContext.userId,
        },
        {
          ticketId: req.ticketId,
          action: "UPDATE",
          field: "status",
          previousValue: oldTicket?.status ?? null,
          newValue: "UNASSIGNED",
          snapshot: oldTicket,
          changedById: userContext.userId,
        }
      );
    }
    if (canAssign && reassignTicket && !!newAssignee?.id) {
      updateData.assigneeId = req.assigneeId;
      updateData.status = "ASSIGNED";
      usersToNotify.push(
        {
          id: previousAssignee?.id!!,
          name: previousAssigneeName,
          email: previousAssignee?.email ?? "N/a",
          updateType: "removed",
        },
        {
          id: newAssignee?.id,
          name: newAssignee?.name ?? "No name listed",
          email: newAssignee?.email ?? "N/a",
          updateType: "added",
        },
        {
          id: newAssignee?.id!!,
          name: newAssignee?.name ?? "No name listed",
          email: newAssignee?.email ?? "N/a",
          updateType: "unchanged",
        }
      );

      ticketHistoryData.push(
        {
          ticketId: req.ticketId,
          action: "ADD",
          field: "assignment",
          previousValue: previousAssigneeName,
          newValue: newAssignee?.name ?? "No name listed",
          snapshot: oldTicket,
          changedById: userContext.userId,
        },
        {
          ticketId: oldTicket.id,
          action: "UPDATE",
          field: "status",
          previousValue: oldTicket?.status ?? "UNASSIGNED",
          newValue: "ASSIGNED",
          snapshot: oldTicket,
          changedById: userContext.userId,
        }
      );

      // Record first response for SLA tracking (assignment counts as first response)
      await slaService.recordFirstResponse(req.ticketId);
    } else if (
      canAssign &&
      !unassignTicket &&
      !reassignTicket &&
      !!oldTicket?.assigneeId
    ) {
      usersToNotify.push({
        id: oldTicket?.assigneeId,
        name: oldTicket?.assignee?.name ?? "No name listed",
        email: oldTicket?.assignee?.email ?? "N/a",
        updateType: "unchanged",
      });
    } else {
      usersToNotify.push({
        id: oldTicket?.creatorId!,
        name: oldTicket?.creator?.name ?? "No name listed",
        email: oldTicket?.creator?.email ?? "N/a",
        updateType: "unchanged",
      });
    }

    if (Object.keys(updateData).length === 0) {
      throw APIError.invalidArgument("no fields to update");
    }

    try {
      // Update ticket
      const ticket = await ticketRepository.update(req.ticketId, updateData);

      if (!ticket) {
        throw APIError.notFound("Ticket not found");
      }

      // Create history records
      await ticketRepository.createManyHistory(ticketHistoryData);

      // Create todos if provided
      if (req.todos && req.todos.length > 0) {
        await todoRepository.createMany(
          req.todos.map((todo) => ({
            title: todo,
            ticketId: ticket.id,
            complete: false,
            createdById: userContext.userId,
          }))
        );

        const newValue = req.todos
          .map((todo) => {
            return `• ${todo}`;
          })
          .join("  ");

        ticketHistoryData.push({
          ticketId: req.ticketId,
          action: "ADD",
          field: "todos",
          previousValue: oldTicket.todos
            ? oldTicket.todos.length.toString()
            : "0",
          newValue: `${req.todos.length}:${newValue}`,
          snapshot: oldTicket,
          changedById: userContext.userId,
        });
      }

      const allChanges: ActivityUpdates[] = ticketHistoryData.map((history) => {
        return {
          label: history.field || "N/a",
          originalValue: history.previousValue ?? "",
          newValue: history.newValue ?? "",
        };
      });

      if (!usersToNotify.length) {
        usersToNotify.push({
          id: ticket.creatorId!,
          name: ticket.creator?.name || "",
          email: ticket.creator?.email || "",
          updateType: "unchanged",
        });
        if (
          ticket?.assigneeId &&
          ticket?.assignee &&
          ticket.creatorId !== oldTicket?.assigneeId
        ) {
          usersToNotify.push({
            id: ticket.assigneeId,
            name: ticket.assignee?.name || "",
            email: ticket.assignee?.email || "",
            updateType: "unchanged",
          });
        }
      }

      return {
        ticket: ticket,
        usersToNotify: usersToNotify,
        changedDetails: allChanges,
      };
    } catch (error: any) {
      if (error.code === "P2025" || error.message?.includes("not found")) {
        throw APIError.notFound("Ticket not found");
      }
      throw error;
    }
  }
);
