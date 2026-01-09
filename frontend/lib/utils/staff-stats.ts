import type { Ticket } from "@/lib/types";

export interface StaffMember {
  id: string;
  name: string | null;
  role: string;
}

export interface StaffStats {
  name: string;
  role: string;
  assigned: number;
  active: number;
  resolved: number;
  overdue: number;
}

/**
 * Calculate staff statistics from tickets
 * - assigned: Non-resolved tickets assigned to the member
 * - active: Non-resolved and non-draft tickets (truly active work)
 * - resolved: Completed tickets
 * - overdue: Non-resolved tickets past their due date
 */
export function calculateStaffStats<T extends StaffMember>(
  teamMembers: T[],
  tickets: Ticket[]
): Record<string, StaffStats> {
  return teamMembers
    .filter((m) => m.role !== "AGENT")
    .reduce((acc: Record<string, StaffStats>, member) => {
      const memberTickets = tickets.filter(
        (t) => t.assigneeId === member.id
      );

      acc[member.id] = {
        name: member.name ?? "",
        role: member.role,
        assigned: memberTickets.filter((t) => t.status !== "RESOLVED").length,
        active: memberTickets.filter(
          (t) => t.status !== "RESOLVED" && t.status !== "DRAFT"
        ).length,
        resolved: memberTickets.filter((t) => t.status === "RESOLVED").length,
        overdue: memberTickets.filter((t) => {
          if (t.status !== "RESOLVED" && t?.dueDate) {
            const dueDate = new Date(t.dueDate);
            const now = new Date();
            return dueDate < now;
          }
          return false;
        }).length,
      };
      return acc;
    }, {});
}
