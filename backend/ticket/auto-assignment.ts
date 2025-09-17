import { api, APIError } from "encore.dev/api";
import { prisma } from "./db";
import type { UserRole, Urgency } from "./types";

export interface AssignmentRule {
  id: string;
  name: string;
  description: string;
  conditions: RuleConditions;
  action: RuleAction;
  priority: number; // Lower number = higher priority
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RuleConditions {
  category?: string[];
  urgency?: Urgency[];
  keywords?: string[];
  creatorRole?: UserRole[];
  timeOfDay?: {
    // Assign based on time
    start: string; // "09:00"
    end: string; // "17:00"
  };
  dayOfWeek?: number[]; // 0-6 (Sunday-Saturday)
}

export interface RuleAction {
  assignToUserId?: string;
  assignToRole?: UserRole;
  assignToNextAvailable?: boolean;
  roundRobin?: {
    userIds: string[];
    lastAssignedIndex?: number;
  };
}

export interface CreateRuleRequest {
  name: string;
  description: string;
  conditions: RuleConditions;
  action: RuleAction;
  priority?: number;
  isActive?: boolean;
}

export interface CreateRuleResponse {
  rule: AssignmentRule;
}

// In-memory storage for rules (in production, use database)
let ASSIGNMENT_RULES: AssignmentRule[] = [
  {
    id: "rule_1",
    name: "High Priority to Senior Staff",
    description: "Automatically assign high priority tickets to senior staff",
    conditions: {
      urgency: ["HIGH"],
    },
    action: {
      assignToRole: "ADMIN",
    },
    priority: 1,
    isActive: true,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
  {
    id: "rule_2",
    name: "Contract Issues to Legal Team",
    description: "Route contract-related tickets to legal team",
    conditions: {
      category: ["contract", "legal"],
      keywords: ["contract", "agreement", "legal", "dispute"],
    },
    action: {
      assignToUserId: "legal_team_user", // Specific user ID
    },
    priority: 2,
    isActive: true,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
  {
    id: "rule_3",
    name: "After Hours to On-Call",
    description: "Route after-hours tickets to on-call staff",
    conditions: {
      timeOfDay: {
        start: "17:00",
        end: "09:00",
      },
    },
    action: {
      roundRobin: {
        userIds: ["user_1", "user_2", "user_3"],
        lastAssignedIndex: 0,
      },
    },
    priority: 3,
    isActive: true,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
];

export const createRule = api<CreateRuleRequest, CreateRuleResponse>(
  {
    expose: true,
    method: "POST",
    path: "/auto-assignments/rules",
    auth: false, // true
  },
  async (req) => {
    // TODO: Implement auth context
    const currentUserRole = "ADMIN" as UserRole;

    // Only admins can create assignment rules
    if (currentUserRole !== "ADMIN") {
      throw APIError.permissionDenied(
        "Only admins can create assignment rules"
      );
    }

    // Validate action has at least one assignment method
    if (
      !req.action.assignToUserId &&
      !req.action.assignToRole &&
      !req.action.assignToNextAvailable &&
      !req.action.roundRobin
    ) {
      throw APIError.invalidArgument(
        "Assignment rule must specify an assignment action"
      );
    }

    // Validate user exists if assignToUserId is specified
    if (req.action.assignToUserId) {
      const user = await prisma.user.findUnique({
        where: { id: req.action.assignToUserId },
      });
      if (!user) {
        throw APIError.notFound("Assigned user not found");
      }
    }

    // Validate users exist for round-robin
    if (req.action.roundRobin) {
      const users = await prisma.user.findMany({
        where: {
          id: { in: req.action.roundRobin.userIds },
        },
      });
      if (users.length !== req.action.roundRobin.userIds.length) {
        throw APIError.invalidArgument(
          "One or more users in round-robin list not found"
        );
      }
    }

    // Create the rule
    const newRule: AssignmentRule = {
      id: `rule_${Date.now()}`,
      name: req.name,
      description: req.description,
      conditions: req.conditions,
      action: req.action,
      priority: req.priority || ASSIGNMENT_RULES.length + 1,
      isActive: req.isActive !== undefined ? req.isActive : true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Add to rules array (in production, save to database)
    ASSIGNMENT_RULES.push(newRule);

    // Re-sort rules by priority
    ASSIGNMENT_RULES.sort((a, b) => a.priority - b.priority);

    return { rule: newRule };
  }
);

// Helper function to apply auto-assignment rules (can be called when creating tickets)
export async function applyAutoAssignment(ticket: {
  category: string;
  urgency: Urgency;
  title: string;
  description: string;
  creatorId: string;
}): Promise<string | null> {
  // Priority 1: Check category-specific default assignee first
  const categoryConfig = await prisma.ticketCategory.findFirst({
    where: {
      name: ticket.category,
      // TODO: Get market center from auth context
      marketCenterId: "market_center_1",
    },
  });

  if (categoryConfig?.defaultAssigneeId) {
    // Verify the assignee still exists and is active
    const assignee = await prisma.user.findFirst({
      where: {
        id: categoryConfig.defaultAssigneeId,
        isActive: true,
      },
    });
    if (assignee) {
      return assignee.id;
    }
  }

  // Priority 2: Apply general auto-assignment rules
  const activeRules = ASSIGNMENT_RULES.filter((r) => r.isActive);

  for (const rule of activeRules) {
    // Check if ticket matches conditions
    if (!matchesConditions(ticket, rule.conditions)) {
      continue;
    }

    // Apply action
    const assigneeId = await executeAction(rule.action);
    if (assigneeId) {
      return assigneeId;
    }
  }

  return null;
}

function matchesConditions(ticket: any, conditions: RuleConditions): boolean {
  // Check category
  if (conditions.category && !conditions.category.includes(ticket.category)) {
    return false;
  }

  // Check urgency
  if (conditions.urgency && !conditions.urgency.includes(ticket.urgency)) {
    return false;
  }

  // Check keywords in title or description
  if (conditions.keywords) {
    const text = `${ticket.title} ${ticket.description}`.toLowerCase();
    const hasKeyword = conditions.keywords.some((keyword) =>
      text.includes(keyword.toLowerCase())
    );
    if (!hasKeyword) {
      return false;
    }
  }

  // Check time of day
  if (conditions.timeOfDay) {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;

    const { start, end } = conditions.timeOfDay;
    if (start < end) {
      // Normal range
      if (currentTime < start || currentTime > end) return false;
    } else {
      // Overnight range
      if (!(currentTime >= start || currentTime <= end)) return false;
    }
  }

  // Check day of week
  if (conditions.dayOfWeek) {
    const today = new Date().getDay();
    if (!conditions.dayOfWeek.includes(today)) {
      return false;
    }
  }

  return true;
}

async function executeAction(action: RuleAction): Promise<string | null> {
  // Assign to specific user
  if (action.assignToUserId) {
    return action.assignToUserId;
  }

  // Assign to first available user with role
  if (action.assignToRole) {
    const user = await prisma.user.findFirst({
      where: {
        role: action.assignToRole,
      },
      orderBy: {
        // Prefer users with fewer assigned tickets
        assignedTickets: {
          _count: "asc",
        },
      },
    });
    return user?.id || null;
  }

  // Round-robin assignment
  if (action.roundRobin) {
    const { userIds, lastAssignedIndex = -1 } = action.roundRobin;
    const nextIndex = (lastAssignedIndex + 1) % userIds.length;

    // Update the index for next time (in production, persist this)
    action.roundRobin.lastAssignedIndex = nextIndex;

    return userIds[nextIndex];
  }

  // Assign to next available (least busy)
  if (action.assignToNextAvailable) {
    const user = await prisma.user.findFirst({
      where: {
        role: { in: ["STAFF", "ADMIN"] },
      },
      orderBy: {
        assignedTickets: {
          _count: "asc",
        },
      },
    });
    return user?.id || null;
  }

  return null;
}
