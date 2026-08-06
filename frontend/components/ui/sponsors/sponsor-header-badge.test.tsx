import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SponsorHeaderBadge, SponsorHeaderBadgeView } from "./sponsor-header-badge";
import { useSponsorSlot } from "@/hooks/use-sponsor-display";

vi.mock("@/hooks/use-sponsor-display", () => ({
  useSponsorSlot: vi.fn(),
}));

const mockUseSponsorSlot = vi.mocked(useSponsorSlot);

beforeEach(() => {
  mockUseSponsorSlot.mockReset();
});

describe("SponsorHeaderBadge", () => {
  it("renders nothing when the header slot is absent", () => {
    mockUseSponsorSlot.mockReturnValue(undefined);

    const { container } = render(<SponsorHeaderBadge />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders the sponsor image and 'Powered by' label when the slot is present", () => {
    mockUseSponsorSlot.mockReturnValue({
      slot: "header",
      name: "Acme Roofing",
      imageUrl: "https://cdn.example.com/header.png",
    });

    render(<SponsorHeaderBadge />);

    expect(screen.getByText("Powered by")).toBeInTheDocument();
    const img = screen.getByAltText("Acme Roofing") as HTMLImageElement;
    expect(img).toBeInTheDocument();
    expect(img.src).toBe("https://cdn.example.com/header.png");
  });

  it("falls back to 'Sponsor' alt text when no name is provided", () => {
    mockUseSponsorSlot.mockReturnValue({
      slot: "header",
      imageUrl: "https://cdn.example.com/header.png",
    });

    render(<SponsorHeaderBadge />);

    expect(screen.getByAltText("Sponsor")).toBeInTheDocument();
  });

  it("wraps the badge in an anchor with target=_blank and sponsored rel when linkUrl is present", () => {
    mockUseSponsorSlot.mockReturnValue({
      slot: "header",
      name: "Acme Roofing",
      imageUrl: "https://cdn.example.com/header.png",
      linkUrl: "https://acme.example.com",
    });

    render(<SponsorHeaderBadge />);

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "https://acme.example.com");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
    expect(link.getAttribute("rel")).toContain("noreferrer");
    expect(link.getAttribute("rel")).toContain("sponsored");
  });

  it("does not render an anchor when linkUrl is absent", () => {
    mockUseSponsorSlot.mockReturnValue({
      slot: "header",
      name: "Acme Roofing",
      imageUrl: "https://cdn.example.com/header.png",
    });

    render(<SponsorHeaderBadge />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});

describe("SponsorHeaderBadgeView", () => {
  it("renders the sponsor image and 'Powered by' label from a plain slot prop", () => {
    render(
      <SponsorHeaderBadgeView
        slot={{
          slot: "header",
          name: "Acme Roofing",
          imageUrl: "https://cdn.example.com/header.png",
          linkUrl: "https://acme.example.com",
        }}
      />
    );

    expect(screen.getByText("Powered by")).toBeInTheDocument();
    const img = screen.getByAltText("Acme Roofing") as HTMLImageElement;
    expect(img.src).toBe("https://cdn.example.com/header.png");
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "https://acme.example.com");
  });

  it("is hidden below md by default (matches the live header placement)", () => {
    const { container } = render(
      <SponsorHeaderBadgeView
        slot={{
          slot: "header",
          imageUrl: "https://cdn.example.com/header.png",
        }}
      />
    );

    const wrapper = container.firstElementChild;
    expect(wrapper).toHaveClass("hidden");
    expect(wrapper).toHaveClass("md:flex");
  });

  it("stays visible regardless of breakpoint when alwaysVisible is set", () => {
    const { container } = render(
      <SponsorHeaderBadgeView
        alwaysVisible
        slot={{
          slot: "header",
          imageUrl: "https://cdn.example.com/header.png",
        }}
      />
    );

    const wrapper = container.firstElementChild;
    expect(wrapper).toHaveClass("flex");
    expect(wrapper).not.toHaveClass("hidden");
  });

  it("falls back to 'Sponsor' alt text when no name is provided", () => {
    render(
      <SponsorHeaderBadgeView
        slot={{
          slot: "header",
          imageUrl: "https://cdn.example.com/header.png",
        }}
      />
    );

    expect(screen.getByAltText("Sponsor")).toBeInTheDocument();
  });
});
