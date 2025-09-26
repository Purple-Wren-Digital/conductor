import { Shield, User, Crown } from "lucide-react";
import {
  SortDir,
  TicketSortBy,
  TicketStatus,
  Urgency,
  UserRole,
} from "./types";

// USERS
export const ROLE_COLORS = {
  ADMIN: "destructive",
  STAFF: "default",
  AGENT: "secondary",
} as const;

export const ROLE_ICONS = {
  ADMIN: Crown,
  STAFF: Shield,
  AGENT: User,
};

export const roleOptions: UserRole[] = ["AGENT", "STAFF", "ADMIN"];

export const ROLE_DESCRIPTIONS = {
  ADMIN: "Full access to all settings and data",
  STAFF: "Can create, view and manage their team and tickets",
  AGENT: "Can view and manage assigned tickets",
};

export const getRoleDescription = (role?: string) => {
  switch (role) {
    case "ADMIN":
      return "Full access to all settings and data";
    case "STAFF":
      return "Create, view and manage their team and associated tickets";
    case "AGENT":
      return "View and update assigned tickets";
    default:
      return "";
  }
};

export const getRoleColor = (role: string) => {
  switch (role) {
    case "ADMIN":
      return "destructive";
    case "STAFF":
      return "default";
    case "USER":
      return "secondary";
    default:
      return "secondary";
  }
};

// TICKETS
export const getStatusColor = (status: TicketStatus) => {
  switch (status) {
    case "RESOLVED":
      return "default";
    case "IN_PROGRESS":
      return "default";
    case "ASSIGNED":
      return "secondary";
    case "AWAITING_RESPONSE":
      return "outline";
    default:
      return "secondary";
  }
};

export const getUrgencyColor = (urgency: Urgency) => {
  switch (urgency) {
    case "HIGH":
      return "destructive";
    case "MEDIUM":
      return "default";
    case "LOW":
      return "secondary";
    default:
      return "secondary";
  }
};

// TICKET FILTERS
export const defaultActiveStatuses: TicketStatus[] = [
  "ASSIGNED",
  "AWAITING_RESPONSE",
  "IN_PROGRESS",
];
export const statusOptions: TicketStatus[] = [
  "ASSIGNED",
  "AWAITING_RESPONSE",
  "IN_PROGRESS",
  "RESOLVED",
];
export const urgencyOptions: Urgency[] = ["HIGH", "MEDIUM", "LOW"];
export const sortDirOptions: SortDir[] = ["asc", "desc"];
export const sortByTicketOptions: TicketSortBy[] = [
  "updatedAt",
  "createdAt",
  "urgency",
  "status",
];

const ticketOptionLabels: Record<TicketSortBy, string> = {
  updatedAt: "Updated At",
  createdAt: "Created At",
  urgency: "Urgency",
  status: "Status",
};

export const formatTicketOptions = (option: TicketSortBy) => {
  return ticketOptionLabels[option] ?? option;
};

// MISC
export async function parseJsonSafe<T>(res: Response): Promise<T> {
  const ct = res.headers.get("content-type") || "";
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `HTTP ${res.status} ${res.statusText} - ${text || "No body"}`
    );
  }
  if (ct.includes("application/json")) {
    return res.json();
  }
  const text = await res.text().catch(() => "");
  throw new Error(
    `Expected JSON but got ${
      ct || "unknown content-type"
    }. First 200 chars:\n${text.slice(0, 200)}`
  );
}
