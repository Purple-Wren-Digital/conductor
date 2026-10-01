import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { RoleSeatNotice } from "./role-seat-notice";

describe("RoleSeatNotice", () => {
  it("says nothing when seats are available", () => {
    const { container } = render(
      <RoleSeatNotice
        canBypassLimits={false}
        hasAvailableSeats
        totalSeats={5}
        currentRole="AGENT"
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("says nothing for enterprise or superusers", () => {
    const { container } = render(
      <RoleSeatNotice
        canBypassLimits
        hasAvailableSeats={false}
        totalSeats={0}
        currentRole="AGENT"
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("names a missing subscription rather than implying seats are full", () => {
    // totalSeats 0 means no ACTIVE/TRIALING subscription, which reads very
    // differently to an admin than "you ran out of seats".
    render(
      <RoleSeatNotice
        canBypassLimits={false}
        hasAvailableSeats={false}
        totalSeats={0}
        currentRole="AGENT"
      />
    );
    expect(screen.getByText(/no active subscription/i)).toBeInTheDocument();
  });

  it("reports the seat count when the plan is simply full", () => {
    render(
      <RoleSeatNotice
        canBypassLimits={false}
        hasAvailableSeats={false}
        totalSeats={5}
        currentRole="AGENT"
      />
    );
    expect(screen.getByText(/All 5 paid seats are in use/i)).toBeInTheDocument();
  });

  it("stays quiet for someone already on a paid role", () => {
    // They can still move between paid roles, so nothing is being restricted.
    const { container } = render(
      <RoleSeatNotice
        canBypassLimits={false}
        hasAvailableSeats={false}
        totalSeats={5}
        currentRole="STAFF"
      />
    );
    expect(container).toBeEmptyDOMElement();
  });
});
