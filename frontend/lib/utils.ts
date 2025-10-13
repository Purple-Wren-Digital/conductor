import {
  Shield,
  User,
  Crown,
  LucideProps,
  UserCheck,
  UserX,
} from "lucide-react";
import {
  MarketCenter,
  OrderBy,
  TicketSortBy,
  TicketStatus,
  Urgency,
  UserRole,
  UserSortBy,
} from "./types";
import { ForwardRefExoticComponent, RefAttributes } from "react";

// export const categoryOptions = [
//   "Appraisals",
//   "Client Comments",
//   "Compliance",
//   "Contracts",
//   "Documents",
//   "Feature Request",
//   "Financial",
//   "Inspections",
//   "Listings",
//   "Maintenance",
//   "Marketing",
//   "Onboarding",
//   "Showing Request",
//   "Technical",
//   "Other",
// ];

// USERS
export const ROLE_COLORS = {
  ADMIN: "destructive",
  STAFF: "default",
  AGENT: "secondary",
} as const;

export const ROLE_ICONS: {
  ADMIN: ForwardRefExoticComponent<
    Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>
  >;
  STAFF: ForwardRefExoticComponent<
    Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>
  >;
  AGENT: ForwardRefExoticComponent<
    Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>
  >;
} = {
  ADMIN: Crown,
  STAFF: Shield,
  AGENT: User,
};

export const roleOptions: UserRole[] = ["AGENT", "STAFF", "ADMIN"];

export const ROLE_DESCRIPTIONS: {
  ADMIN: string;
  STAFF: string;
  AGENT: string;
} = {
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

export function getRoleBadgeStyle(
  role: string
): React.CSSProperties | undefined {
  switch (role) {
    case "ADMIN":
      return {
        backgroundColor: "#ef4444",
        color: "white",
        borderColor: "#dc2626",
      };
    case "STAFF":
      return undefined;
    case "USER":
      return {
        backgroundColor: "#e5e7eb",
        color: "#111827",
        borderColor: "#d1d5db",
      };
    default:
      return undefined;
  }
}
// TICKETS

function hashString(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function getCategoryStyle(category: string): React.CSSProperties {
  const hue = hashString(category) % 360;
  const bg = `hsl(${hue}, 70%, 85%)`;
  const border = `hsl(${hue}, 60%, 70%)`;
  const color = `hsl(222, 14%, 12%)`;
  return { backgroundColor: bg, borderColor: border, color };
}

export function getStatusBadgeStyle(
  status: string
): React.CSSProperties | undefined {
  switch (status) {
    case "RESOLVED":
      return {
        backgroundColor: "#16a34a",
        color: "white",
        borderColor: "#15803d",
      };
    case "IN_PROGRESS":
      return undefined;
    case "ASSIGNED":
      return undefined;
    case "AWAITING_RESPONSE":
      return undefined;
    default:
      return undefined;
  }
}

export function getUrgencyBadgeStyle(
  urgency: string
): React.CSSProperties | undefined {
  switch (urgency) {
    case "HIGH":
      return {
        backgroundColor: "#ef4444",
        color: "white",
        borderColor: "#dc2626",
      };
    case "MEDIUM":
      return {
        backgroundColor: "#fb923c",
        color: "#111827",
        borderColor: "#f97316",
      };
    case "LOW":
      return {
        backgroundColor: "#fde047",
        color: "#111827",
        borderColor: "#facc15",
      };
    default:
      return undefined;
  }
}

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

export const capitalizeEachWord = (text: string) => {};

// FILTERS
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

export const orderByOptions: OrderBy[] = ["asc", "desc"];
export const orderByLabels: Record<OrderBy, string> = {
  asc: "Ascending",
  desc: "Descending",
};

export const formatOrderBy = (option: OrderBy) => {
  return orderByLabels[option] ?? option;
};
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

export const sortByUserOptions: UserSortBy[] = [
  "updatedAt",
  "createdAt",
  "name",
];

const userOptionLabels: Record<UserSortBy, string> = {
  updatedAt: "Updated At",
  createdAt: "Created At",
  name: "Name",
};

export const formatUserOptions = (option: UserSortBy) => {
  return userOptionLabels[option] ?? option;
};

export type UserStatusType = "Active" | "Inactive";
export const userStatusOptions: UserStatusType[] = ["Active", "Inactive"];

export const USER_STATUS_ICONS = {
  Active: UserCheck,
  Inactive: UserX,
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

export const calculateTotalPages = ({
  totalItems,
  itemsPerPage,
}: {
  totalItems: number;
  itemsPerPage: number;
}) => {
  return totalItems > 0 ? Math.ceil(totalItems / itemsPerPage) : 1;
};

export const formatPaginationText = ({
  totalItems,
  itemsPerPage,
  currentPage,
}: {
  totalItems: number;
  itemsPerPage: number;
  currentPage: number;
}) => {
  return `${totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} - ${Math.min(currentPage * itemsPerPage, totalItems)} `;
};

// MISC

export const capitalizeEveryWord = (words: string | undefined) => {
  if (!words) return "";
  const wordArray = words.split(" ");
  const capitalizedArray = wordArray.map(
    (word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  );
  return capitalizedArray.join(" ");
};

// MARKET CENTERS

export const findMarketCenter = (
  marketCenters: MarketCenter[],
  marketCenterId?: string | null
) => {
  if (!marketCenterId) return {} as MarketCenter;
  const foundMarketCenter = marketCenters.find(
    (mc) => mc?.id === marketCenterId
  );
  return foundMarketCenter as MarketCenter;
};

export function arraysEqualById(a: { id: string }[], b: { id: string }[]) {
  if (a.length !== b.length) return false;

  const aIds = a.map((u) => u.id).sort();
  const bIds = b.map((u) => u.id).sort();

  return aIds.every((id, i) => id === bIds[i]);
}

// SETTINGS
export type SettingsActions =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "INVITE"
  | "REMOVE"
  | "ROLE CHANGE";
export const settingsActionOptions: SettingsActions[] = [
  "CREATE",
  "UPDATE",
  "INVITE",
  "ROLE CHANGE",
  "REMOVE",
  "DELETE",
];

export type SettingsCategories =
  | "Business Hours"
  | "Branding"
  | "Categories"
  | "General"
  | "Holidays"
  | "Team";
export const settingsSectionOptions: SettingsCategories[] = [
  "General",
  "Team",
  "Categories",
  "Branding",
  "Business Hours",
  "Holidays",
];

export const DAYS = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
] as const;

export const TIMEZONES = [
  // { value: "UTC", label: "UTC" },
  { value: "America/New_York", label: "Eastern Time" },
  // { value: "America/Chicago", label: "Central Time" },
  // { value: "America/Denver", label: "Mountain Time" },
  // { value: "America/Los_Angeles", label: "Pacific Time" },
];

export const LANGUAGES = [
  { value: "en", label: "English" },
  // { value: "es", label: "Spanish" },
  // { value: "fr", label: "French" },
];
