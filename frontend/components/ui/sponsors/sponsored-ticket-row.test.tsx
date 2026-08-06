import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  SponsoredTicketRow,
  SponsoredTicketRowView,
} from "./sponsored-ticket-row";
import { useSponsorSlot } from "@/hooks/use-sponsor-display";

vi.mock("@/hooks/use-sponsor-display", () => ({
  useSponsorSlot: vi.fn(),
}));

const mockUseSponsorSlot = vi.mocked(useSponsorSlot);

function renderRow(colSpan: number) {
  return render(
    <table>
      <tbody>
        <SponsoredTicketRow colSpan={colSpan} />
      </tbody>
    </table>
  );
}

beforeEach(() => {
  mockUseSponsorSlot.mockReset();
});

describe("SponsoredTicketRow", () => {
  it("renders nothing when the ticketListRow slot is absent", () => {
    mockUseSponsorSlot.mockReturnValue(undefined);

    const { container } = renderRow(6);

    // Only the empty <table><tbody> shell should remain
    expect(container.querySelector("td")).not.toBeInTheDocument();
  });

  it("renders the Sponsored label, name, and image when the slot is present", () => {
    mockUseSponsorSlot.mockReturnValue({
      slot: "ticketListRow",
      name: "Acme Roofing",
      imageUrl: "https://cdn.example.com/row.png",
    });

    renderRow(6);

    expect(screen.getByText("Sponsored")).toBeInTheDocument();
    expect(screen.getByText("Acme Roofing")).toBeInTheDocument();
    const img = screen.getByAltText("Acme Roofing") as HTMLImageElement;
    expect(img.src).toBe("https://cdn.example.com/row.png");
  });

  it("falls back to 'Sponsor' text/alt when no name is provided", () => {
    mockUseSponsorSlot.mockReturnValue({
      slot: "ticketListRow",
      imageUrl: "https://cdn.example.com/row.png",
    });

    renderRow(6);

    expect(screen.getAllByText("Sponsor").length).toBeGreaterThan(0);
    expect(screen.getByAltText("Sponsor")).toBeInTheDocument();
  });

  it("wraps the row content in an anchor with target=_blank and sponsored rel when linkUrl is present", () => {
    mockUseSponsorSlot.mockReturnValue({
      slot: "ticketListRow",
      name: "Acme Roofing",
      imageUrl: "https://cdn.example.com/row.png",
      linkUrl: "https://acme.example.com",
    });

    renderRow(6);

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "https://acme.example.com");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
    expect(link.getAttribute("rel")).toContain("noreferrer");
    expect(link.getAttribute("rel")).toContain("sponsored");
  });

  it("does not render an anchor when linkUrl is absent", () => {
    mockUseSponsorSlot.mockReturnValue({
      slot: "ticketListRow",
      name: "Acme Roofing",
      imageUrl: "https://cdn.example.com/row.png",
    });

    renderRow(6);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("respects the colSpan prop on the single TableCell", () => {
    mockUseSponsorSlot.mockReturnValue({
      slot: "ticketListRow",
      name: "Acme Roofing",
      imageUrl: "https://cdn.example.com/row.png",
    });

    const { container } = renderRow(4);

    const cells = container.querySelectorAll("td");
    expect(cells).toHaveLength(1);
    expect(cells[0]).toHaveAttribute("colspan", "4");
  });

  it("does not render a checkbox", () => {
    mockUseSponsorSlot.mockReturnValue({
      slot: "ticketListRow",
      name: "Acme Roofing",
      imageUrl: "https://cdn.example.com/row.png",
    });

    renderRow(6);

    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });
});

function renderRowView(colSpan: number, slot: Parameters<typeof SponsoredTicketRowView>[0]["slot"]) {
  return render(
    <table>
      <tbody>
        <SponsoredTicketRowView slot={slot} colSpan={colSpan} />
      </tbody>
    </table>
  );
}

describe("SponsoredTicketRowView", () => {
  it("renders the Sponsored label, name, image, and colSpan from a plain slot prop", () => {
    renderRowView(6, {
      slot: "ticketListRow",
      name: "Acme Roofing",
      imageUrl: "https://cdn.example.com/row.png",
      linkUrl: "https://acme.example.com",
    });

    expect(screen.getByText("Sponsored")).toBeInTheDocument();
    expect(screen.getByText("Acme Roofing")).toBeInTheDocument();
    const img = screen.getByAltText("Acme Roofing") as HTMLImageElement;
    expect(img.src).toBe("https://cdn.example.com/row.png");
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "https://acme.example.com");
  });

  it("respects the colSpan prop on the single TableCell", () => {
    const { container } = renderRowView(3, {
      slot: "ticketListRow",
      name: "Acme Roofing",
      imageUrl: "https://cdn.example.com/row.png",
    });

    const cells = container.querySelectorAll("td");
    expect(cells).toHaveLength(1);
    expect(cells[0]).toHaveAttribute("colspan", "3");
  });
});
