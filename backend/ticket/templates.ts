import { api } from "encore.dev/api";
import type { Urgency } from "./types";
import { getAuthData } from "~encore/auth";

export interface TicketTemplate {
  id: string;
  name: string;
  description: string;
  title: string;
  ticketDescription: string;
  category: string;
  urgency: Urgency;
  tags?: string[];
  isActive: boolean;
}

export interface GetTemplatesRequest {
  category?: string;
  isActive?: boolean;
}

export interface GetTemplatesResponse {
  templates: TicketTemplate[];
}

// Hardcoded templates for now - could be moved to database later
const TICKET_TEMPLATES: TicketTemplate[] = [
  {
    id: "template_1",
    name: "Property Showing Request",
    description: "Template for scheduling property showings",
    title: "Property Showing Request - [Property Address]",
    ticketDescription:
      "Client wants to schedule a showing for the property at [Address].\n\nPreferred dates/times:\n- \n\nClient contact:\n- Name: \n- Phone: \n- Email: \n\nAdditional notes:",
    category: "showing",
    urgency: "MEDIUM",
    tags: ["property", "showing", "client"],
    isActive: true,
  },
  {
    id: "template_2",
    name: "Urgent Contract Issue",
    description: "Template for urgent contract-related issues",
    title: "URGENT: Contract Issue - [Property/Client]",
    ticketDescription:
      "Urgent issue with contract for [Property/Client].\n\nIssue type:\n[ ] Missing signatures\n[ ] Incorrect terms\n[ ] Deadline approaching\n[ ] Other: \n\nDetails:\n\nDeadline: \n\nAction needed:",
    category: "contract",
    urgency: "HIGH",
    tags: ["contract", "urgent", "legal"],
    isActive: true,
  },
  {
    id: "template_3",
    name: "New Listing Setup",
    description: "Template for setting up a new property listing",
    title: "New Listing Setup - [Property Address]",
    ticketDescription:
      "New listing to be set up.\n\nProperty details:\n- Address: \n- Price: \n- Bedrooms: \n- Bathrooms: \n- Square feet: \n\nTasks needed:\n[ ] Photography scheduled\n[ ] MLS entry\n[ ] Marketing materials\n[ ] Sign installation\n[ ] Open house planning\n\nTarget go-live date:",
    category: "listing",
    urgency: "MEDIUM",
    tags: ["listing", "new", "setup"],
    isActive: true,
  },
  {
    id: "template_4",
    name: "Client Complaint",
    description: "Template for handling client complaints",
    title: "Client Complaint - [Client Name]",
    ticketDescription:
      "Client complaint received.\n\nClient: \nDate of incident: \n\nNature of complaint:\n\nDetails:\n\nClient's desired resolution:\n\nPriority level: \n\nAssigned to:",
    category: "support",
    urgency: "HIGH",
    tags: ["complaint", "client", "support"],
    isActive: true,
  },
  {
    id: "template_5",
    name: "Document Request",
    description: "Template for document requests",
    title: "Document Request - [Document Type]",
    ticketDescription:
      "Document request from [Requester].\n\nDocuments needed:\n[ ] Purchase agreement\n[ ] Disclosure forms\n[ ] Inspection reports\n[ ] Title documents\n[ ] Other: \n\nRequired by: \nPurpose: \n\nDelivery method:\n[ ] Email\n[ ] Physical copy\n[ ] Upload to portal",
    category: "documents",
    urgency: "LOW",
    tags: ["documents", "request"],
    isActive: true,
  },
  {
    id: "template_6",
    name: "Maintenance Request",
    description: "Template for property maintenance requests",
    title: "Maintenance Request - [Property Address]",
    ticketDescription:
      "Maintenance request for property.\n\nProperty: \nTenant/Owner: \n\nIssue description:\n\nUrgency:\n[ ] Emergency (immediate)\n[ ] Urgent (24-48 hours)\n[ ] Routine (within a week)\n\nAccess instructions:\n\nPreferred service window:",
    category: "maintenance",
    urgency: "MEDIUM",
    tags: ["maintenance", "property", "repair"],
    isActive: true,
  },
];

export const getTemplates = api<GetTemplatesRequest, GetTemplatesResponse>(
  { expose: true, method: "GET", path: "/ticket-templates", auth: true },
  async (req) => {
    const auth = await getAuthData();
    if (!auth || !auth.userID) {
      throw new Error("Unauthorized");
    }
    let templates = [...TICKET_TEMPLATES];

    // Filter by category if provided
    if (req.category) {
      templates = templates.filter((t) => t.category === req.category);
    }

    // Filter by active status if provided
    if (req.isActive !== undefined) {
      templates = templates.filter((t) => t.isActive === req.isActive);
    }

    return { templates };
  }
);
