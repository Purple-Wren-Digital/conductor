import { Ticket } from "../ticket/types";
import { User } from "../user/types";

export interface Todo {
  id: string;
  title: string;
  complete: boolean;
  ticketId: string;
  createdById: string;
  updatedById?: string | null;

  createdAt: Date;
  updatedAt?: Date;

  ticket?: Ticket;
  createdBy?: { id: string; name?: string } | User;
  updatedBy?: { id: string; name?: string } | User;
}
