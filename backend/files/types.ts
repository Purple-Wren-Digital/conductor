import { Ticket } from "@prisma/client";

export interface TicketFile {
  id: string;
  filename: string;
  url: string;
  uploadedAt: Date;
  uploaderId: string;
  uploaderName: string | null;
  ticketId: string;
  ticket?: Ticket;
}
