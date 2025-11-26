import type { Urgency } from "../types";

export interface TicketTemplate {
  id: string;
  name: string;
  description: string;
  title: string;
  ticketDescription: string;
  category?: string;
  urgency?: Urgency;
  tags?: string[];
  isActive: boolean;
  todos: string[];
}
