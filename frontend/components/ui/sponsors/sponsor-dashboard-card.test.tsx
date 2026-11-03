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

describe("SponsorDashboardCardView creative sizing", () => {
  it("scales the creative to fit without cropping it", () => {
    render(
      <SponsorDashboardCardView
        slot={{
          slot: "dashboardCard",
          name: "Acme Roofing",
          imageUrl: "https://cdn.example.com/card.png",
        }}
      />
    );

    const img = screen.getByAltText("Acme Roofing");
    expect(img).toHaveClass("object-contain");
    // `object-cover` fills the tile by cropping the overflowing axis, which
    // slices the edges off wide sponsor logos.
    expect(img).not.toHaveClass("object-cover");
    expect(img).toHaveClass("h-full");
    expect(img).toHaveClass("w-full");
  });

  it("keeps the creative out of flow so it cannot drive the card's height", () => {
    render(
      <SponsorDashboardCardView
        slot={{
          slot: "dashboardCard",
          imageUrl: "https://cdn.example.com/card.png",
        }}
      />
    );

    // Regression guard: in normal flow a tall/square creative sizes the card to
    // its intrinsic height, and grid row stretching drags every sibling stat
    // card up to match — a 400px-square upload produced a ~500px stats row.
    const img = screen.getByAltText("Sponsor");
    expect(img).toHaveClass("absolute");
    expect(img).toHaveClass("inset-0");
    expect(img.parentElement).toHaveClass("relative");
  });

  it("spans two stat-grid columns so wide logos stay legible", () => {
    const { container } = render(
      <SponsorDashboardCardView
        slot={{
          slot: "dashboardCard",
          imageUrl: "https://cdn.example.com/card.png",
        }}
      />
    );

    expect(container.firstElementChild).toHaveClass("col-span-2");
  });

  it("spans two stat-grid columns when the card is a link", () => {
    const { container } = render(
      <SponsorDashboardCardView
        slot={{
          slot: "dashboardCard",
          imageUrl: "https://cdn.example.com/card.png",
          linkUrl: "https://acme.example.com",
        }}
      />
    );

    // The anchor is the grid item in this case, so the span has to live on it.
    expect(container.firstElementChild).toHaveClass("col-span-2");
    expect(screen.getByRole("link")).toHaveClass("col-span-2");
  });

  it("keeps the attribution out of the creative's box", () => {
    render(
      <SponsorDashboardCardView
        slot={{
          slot: "dashboardCard",
          name: "Acme Roofing",
          imageUrl: "https://cdn.example.com/card.png",
        }}
      />
    );

    // An overlaid scrim would sit on top of a contained logo and clip it.
    const attribution = screen.getByText("Sponsored").parentElement;
    expect(attribution).not.toHaveClass("absolute");
    expect(attribution).not.toContainElement(screen.getByAltText("Acme Roofing"));
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
