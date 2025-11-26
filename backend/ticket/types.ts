import type { TicketCategory } from "../marketCenters/types";
import { Todo } from "../todos/types";
import type { User } from "../user/types";

export type TicketStatus =
  | "DRAFT"
  | "CREATED"
  | "ASSIGNED"
  | "UNASSIGNED"
  | "AWAITING_RESPONSE"
  | "IN_PROGRESS"
  | "RESOLVED";
export type Urgency = "HIGH" | "MEDIUM" | "LOW";
export type TicketField =
  | "isActive"
  | "title"
  | "description"
  | "status"
  | "urgency"
  | "category"
  | "assigneeId"
  | "dueDate";

export type UserFields =
  | "name"
  | "email"
  | "role"
  | "isActive"
  | "marketCenterId"
  | "ticketAssignment"
  | "ticketCreation";

export interface Attachment {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  bucketKey: string;
  ticketId: string;
  uploadedBy: string;
  createdAt: Date;
  updatedAt: Date;
  uploader?:
    | User
    | {
        id: string;
        name: string;
        email: string;
      };
  uploaderName?: string;
}

export interface Ticket {
  id: string;
  title: string | null; // Prisma: title String?  => allow null (or keep string if you always normalize)
  description: string | null; // Prisma: description String? => allow null
  status: TicketStatus;
  urgency: Urgency;
  categoryId?: string | null;
  creatorId?: string;
  assigneeId?: string | null;
  dueDate: Date | null;
  resolvedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  creator?: User;
  assignee?: User | null;
  category?: TicketCategory | null;
  commentCount?: number | null;
  attachmentCount?: number | null;
  attachments?: Attachment[];
  deletedAt?: Date | null;
  isActive?: boolean;
  ticketHistory?: TicketHistory[];
  emailMessageId?: string | null;
  todos?: Todo[];
}

export interface Comment {
  id: string;
  content: string;
  ticketId: string;
  userId: string;
  internal: boolean;
  createdAt: Date;
  user?: User;
}

export interface TicketFilters {
  status?: TicketStatus[];
  urgency?: Urgency[];
  assigneeId?: string;
  creatorId?: string;
  category?: string;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}

export interface DashboardMetrics {
  totalTickets: number;
  openTickets: number;
  overdueTickets: number;
  avgResponseTime: number;
  ticketsByStatus: Record<TicketStatus, number>;
  ticketsByUrgency: Record<Urgency, number>;
}

export interface TicketHistory {
  id: string;
  ticketId: string;
  action: string;
  field: string | null;
  previousValue: string | null;
  newValue: string | null;
  snapshot?: {}; // Ticket as it was in this moment
  changedAt: Date;
  changedById: string;
  changedBy?: User;
}
