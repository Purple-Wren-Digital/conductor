import type { Urgency } from "../types";

export interface TicketTemplate {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  title: string;
  ticketDescription: string;
  categoryId?: string;
  urgency?: Urgency;
  tags?: string[];
  todos?: string[];
  marketCenterId: string;
  createdAt: string;
  updatedAt: string;
  createdById: string | null;
  updatedById: string | null;
}
