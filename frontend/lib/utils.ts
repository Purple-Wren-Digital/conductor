import {
  Crown,
  LucideProps,
  Shield,
  ShieldHalf,
  User,
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
  STAFF_LEADER: ForwardRefExoticComponent<
    Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>
  >;
  AGENT: ForwardRefExoticComponent<
    Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>
  >;
} = {
  ADMIN: Crown,
  STAFF_LEADER: ShieldHalf,
  STAFF: Shield,
  AGENT: User,
};

export const roleOptions: UserRole[] = [
  "ADMIN",
  "STAFF_LEADER",
  "STAFF",
  "AGENT",
];

export const ROLE_DESCRIPTIONS: {
  ADMIN: string;
  STAFF_LEADER: string;
  STAFF: string;
  AGENT: string;
} = {
  ADMIN: "Full access to all settings and data",
  STAFF_LEADER: "Manage all tickets and team members",
  STAFF: "Manage all assigned tickets and assist other team members",
  AGENT: "View and manage created tickets",
};

export const getRoleDescription = (userRole: UserRole) => {
  const description = ROLE_DESCRIPTIONS[userRole as keyof typeof ROLE_ICONS];
  return description;
};

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

export const capitalizeEachWord = (text: string) => {};

// FILTERS
export const defaultActiveStatuses: TicketStatus[] = [
  "CREATED",
  "ASSIGNED",
  "UNASSIGNED",
  "AWAITING_RESPONSE",
  "IN_PROGRESS",
];
export const statusOptions: TicketStatus[] = [
  "CREATED",
  "ASSIGNED",
  "UNASSIGNED",
  "IN_PROGRESS",
  "AWAITING_RESPONSE",
  "RESOLVED",
];
export const urgencyOptions: Urgency[] = ["HIGH", "MEDIUM", "LOW"];
type UrgencyKey = (typeof urgencyOptions)[number];

const URGENCY_COLORS: Record<UrgencyKey, string> = {
  HIGH: "#B42318",
  MEDIUM: "#C18900",
  LOW: "#175CD3",
};

export const urgencyChartConfig: Record<
  Urgency,
  { label: string; color: string }
> = {
  HIGH: { label: "High", color: URGENCY_COLORS.HIGH },
  MEDIUM: { label: "Medium", color: URGENCY_COLORS.MEDIUM },
  LOW: { label: "Low", color: URGENCY_COLORS.LOW },
};

// export const formatUrgency = (urgency: Urgency) => {
//   return URGENCY_LABELS[urgency] ?? urgency;
// };

// SORTING & PAGINATION

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
  "role",
];

const userOptionLabels: Record<UserSortBy, string> = {
  updatedAt: "Updated At",
  createdAt: "Created At",
  name: "Name",
  role: "Role",
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
export function arrayToCommaSeparatedListWithConjunction(
  conjunction: "and" | "or",
  array: any[]
) {
  if (array.length === 0) {
    return "";
  } else if (array.length === 1) {
    return array[0];
  } else if (array.length === 2) {
    return array.join(` ${conjunction} `);
  } else {
    const allButLast = array.slice(0, -1).join(", ");
    const lastElement = array.slice(-1)[0];
    return `${allButLast}, ${conjunction} ${lastElement}`;
  }
}

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

// REPORTS, METRICS, CHARTS
export const chartColors = {
  blue: "#175CD3",
  orange: "#C4320A",
  indigo: "#3538CD",
  yellow: "#F7BB00",
  purple: "#6941C6",
  pink: "#BC2E74",
  green: "#027A48",
  red: "#B42318",
  grey: "#9CA3AF",
};

export const STATUS_ORDER = [
  "CREATED",
  "UNASSIGNED",
  "ASSIGNED",
  "AWAITING_RESPONSE",
  "IN_PROGRESS",
  "RESOLVED",
] as const;
export type StatusKey = (typeof STATUS_ORDER)[number];
export const STATUS_LABELS: Record<StatusKey, string> = {
  CREATED: "Created",
  UNASSIGNED: "Unassigned",
  ASSIGNED: "Assigned",
  AWAITING_RESPONSE: "Awaiting Response",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
};
export const STATUS_COLORS: Record<StatusKey, string> = {
  CREATED: "#B42318",
  UNASSIGNED: "#C4320A",
  ASSIGNED: "#C18900",
  AWAITING_RESPONSE: "#6B21A8",
  IN_PROGRESS: "#3538CD",
  RESOLVED: "#027A48",
};
export const ticketByStatusChartConfig = {
  CREATED: { label: STATUS_LABELS.CREATED, color: STATUS_COLORS.CREATED },
  UNASSIGNED: {
    label: STATUS_LABELS.UNASSIGNED,
    color: STATUS_COLORS.UNASSIGNED,
  },
  ASSIGNED: { label: STATUS_LABELS.ASSIGNED, color: STATUS_COLORS.ASSIGNED },
  AWAITING_RESPONSE: {
    label: STATUS_LABELS.AWAITING_RESPONSE,
    color: STATUS_COLORS.AWAITING_RESPONSE,
  },
  IN_PROGRESS: {
    label: STATUS_LABELS.IN_PROGRESS,
    color: STATUS_COLORS.IN_PROGRESS,
  },
  RESOLVED: { label: STATUS_LABELS.RESOLVED, color: STATUS_COLORS.RESOLVED },
};

export function getResolvedInBusinessDays(
  startDate: Date,
  endDate: Date
): number {
  let count = 0;
  const current = new Date(startDate);

  while (current <= endDate) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) count += 1; // skip Sunday (0) and Saturday (6)
    current.setDate(current.getDate() + 1);
  }

  return count;
}
