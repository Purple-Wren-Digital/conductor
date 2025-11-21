import { api } from "encore.dev/api";
import type { TicketTemplate } from "./types";
import { TICKET_TEMPLATES } from "./utils";
import { getUserContext } from "../../auth/user-context";

export interface GetTemplatesRequest {
  category?: string;
  isActive?: boolean;
}

export interface GetTemplatesResponse {
  templates: TicketTemplate[];
}

export const getTemplates = api<GetTemplatesRequest, GetTemplatesResponse>(
  {
    expose: true,
    method: "GET",
    path: "/ticket-templates",
    auth: true, // true
  },
  async (req) => {
    const userContext = await getUserContext();

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
