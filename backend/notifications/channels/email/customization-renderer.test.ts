import { describe, it, expect, vi } from "vitest";

vi.mock("encore.dev/config", () => ({
  secret: (_name: string) => () => "https://app.example.com",
}));

vi.mock("@/emails/index", () => ({
  CustomizableEmail: (props: any) => props,
}));

vi.mock("../../templates/customization-repository", () => ({
  emailTemplateCustomizationRepository: {
    findByMarketCenterAndType: vi.fn(),
  },
}));

import { getButtonUrl } from "./customization-renderer";
import type { Notification } from "../../types";

const baseNotification = (data: Record<string, unknown>): Notification =>
  ({
    type: "Ticket Created",
    data,
  }) as unknown as Notification;

describe("getButtonUrl", () => {
  it("ticket_created with ticketNumber links to the ticket detail page", () => {
    const notification = baseNotification({
      createdTicket: { ticketNumber: "tk-123" },
    });
    const url = getButtonUrl(notification, "ticket_created");
    expect(url).toBe("https://app.example.com/dashboard/tickets/tk-123");
  });

  it("ticket_updated with ticketNumber links to the ticket detail page", () => {
    const notification = baseNotification({
      updatedTicket: { ticketNumber: "tk-456" },
    });
    const url = getButtonUrl(notification, "ticket_updated");
    expect(url).toBe("https://app.example.com/dashboard/tickets/tk-456");
  });

  it("ticket_assignment with ticketNumber links to the ticket detail page", () => {
    const notification = baseNotification({
      ticketAssignment: { ticketNumber: "tk-789" },
    });
    const url = getButtonUrl(notification, "ticket_assignment");
    expect(url).toBe("https://app.example.com/dashboard/tickets/tk-789");
  });

  it("new_comments with ticketNumber links to the ticket detail page", () => {
    const notification = baseNotification({
      newComment: { ticketNumber: "tk-c1" },
    });
    const url = getButtonUrl(notification, "new_comments");
    expect(url).toBe("https://app.example.com/dashboard/tickets/tk-c1");
  });

  it("ticket_survey links to the ticket with survey=true query param", () => {
    const notification = baseNotification({
      ticketSurvey: { ticketNumber: "tk-s1" },
    });
    const url = getButtonUrl(notification, "ticket_survey");
    expect(url).toBe(
      "https://app.example.com/dashboard/tickets/tk-s1?survey=true"
    );
  });

  it("ticket_survey_results links to the ticket detail page", () => {
    const notification = baseNotification({
      surveyResults: { ticketNumber: "tk-sr1" },
    });
    const url = getButtonUrl(notification, "ticket_survey_results");
    expect(url).toBe("https://app.example.com/dashboard/tickets/tk-sr1");
  });

  it("market_center_assignment links to the market center page", () => {
    const notification = baseNotification({
      marketCenterAssignment: { marketCenterId: "mc-1" },
    });
    const url = getButtonUrl(notification, "market_center_assignment");
    expect(url).toBe("https://app.example.com/dashboard/market-centers/mc-1");
  });

  it("category_assignment links to the market center page", () => {
    const notification = baseNotification({
      categoryAssignment: { marketCenterId: "mc-2" },
    });
    const url = getButtonUrl(notification, "category_assignment");
    expect(url).toBe("https://app.example.com/dashboard/market-centers/mc-2");
  });

  it("falls back to dashboard when there is no ticket or market center context", () => {
    const notification = baseNotification({});
    const url = getButtonUrl(notification, "ticket_created");
    expect(url).toBe("https://app.example.com/dashboard");
  });
});
