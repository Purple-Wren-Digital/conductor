import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  SponsorDashboardCard,
  SponsorDashboardCardView,
} from "./sponsor-dashboard-card";
import { useSponsorSlot } from "@/hooks/use-sponsor-display";

vi.mock("@/hooks/use-sponsor-display", () => ({
  useSponsorSlot: vi.fn(),
}));

const mockUseSponsorSlot = vi.mocked(useSponsorSlot);

beforeEach(() => {
  mockUseSponsorSlot.mockReset();
});

describe("SponsorDashboardCard", () => {
  it("renders nothing when the dashboardCard slot is absent", () => {
    mockUseSponsorSlot.mockReturnValue(undefined);

    const { container } = render(<SponsorDashboardCard />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders the creative image and Sponsored label when the slot is present", () => {
    mockUseSponsorSlot.mockReturnValue({
      slot: "dashboardCard",
      name: "Acme Roofing",
      imageUrl: "https://cdn.example.com/card.png",
    });

    render(<SponsorDashboardCard />);

    expect(screen.getByText("Sponsored")).toBeInTheDocument();
    const img = screen.getByAltText("Acme Roofing") as HTMLImageElement;
    expect(img.src).toBe("https://cdn.example.com/card.png");
    expect(screen.getByText("Acme Roofing")).toBeInTheDocument();
  });

  it("falls back to 'Sponsor' alt text when no name is provided", () => {
    mockUseSponsorSlot.mockReturnValue({
      slot: "dashboardCard",
      imageUrl: "https://cdn.example.com/card.png",
    });

    render(<SponsorDashboardCard />);

    expect(screen.getByAltText("Sponsor")).toBeInTheDocument();
  });

  it("wraps the card in a single anchor with target=_blank and sponsored rel when linkUrl is present", () => {
    mockUseSponsorSlot.mockReturnValue({
      slot: "dashboardCard",
      name: "Acme Roofing",
      imageUrl: "https://cdn.example.com/card.png",
      linkUrl: "https://acme.example.com",
    });

    render(<SponsorDashboardCard />);

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute("href", "https://acme.example.com");
    expect(links[0]).toHaveAttribute("target", "_blank");
    expect(links[0].getAttribute("rel")).toContain("noopener");
    expect(links[0].getAttribute("rel")).toContain("noreferrer");
    expect(links[0].getAttribute("rel")).toContain("sponsored");
  });

  it("does not render an anchor when linkUrl is absent", () => {
    mockUseSponsorSlot.mockReturnValue({
      slot: "dashboardCard",
      name: "Acme Roofing",
      imageUrl: "https://cdn.example.com/card.png",
    });

    render(<SponsorDashboardCard />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});

describe("SponsorDashboardCardView", () => {
  it("renders the creative image, Sponsored label, and name from a plain slot prop", () => {
    render(
      <SponsorDashboardCardView
        slot={{
          slot: "dashboardCard",
          name: "Acme Roofing",
          imageUrl: "https://cdn.example.com/card.png",
          linkUrl: "https://acme.example.com",
        }}
      />
    );

    expect(screen.getByText("Sponsored")).toBeInTheDocument();
    expect(screen.getByText("Acme Roofing")).toBeInTheDocument();
    const img = screen.getByAltText("Acme Roofing") as HTMLImageElement;
    expect(img.src).toBe("https://cdn.example.com/card.png");
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "https://acme.example.com");
  });

  it("renders without a link wrapper when linkUrl is absent", () => {
    render(
      <SponsorDashboardCardView
        slot={{
          slot: "dashboardCard",
          imageUrl: "https://cdn.example.com/card.png",
        }}
      />
    );

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByAltText("Sponsor")).toBeInTheDocument();
  });
});
