import { describe, it, expect } from "vitest";
import { canAssignRoleOption } from "./utils";

describe("canAssignRoleOption", () => {
  it("still offers AGENT to an admin who has no seats left", () => {
    expect(
      canAssignRoleOption({
        option: "AGENT",
        viewerRole: "ADMIN",
        canBypassLimits: false,
        hasAvailableSeats: false,
      })
    ).toBe(true);
  });

  it("hides paid roles when no seats are left", () => {
    expect(
      canAssignRoleOption({
        option: "STAFF",
        viewerRole: "ADMIN",
        canBypassLimits: false,
        hasAvailableSeats: false,
      })
    ).toBe(false);
  });

  it("offers every role to an admin with seats available", () => {
    const options = ["ADMIN", "STAFF_LEADER", "STAFF", "AGENT"] as const;

    options.forEach((option) => {
      expect(
        canAssignRoleOption({
          option,
          viewerRole: "ADMIN",
          canBypassLimits: false,
          hasAvailableSeats: true,
        })
      ).toBe(true);
    });
  });

  it("offers every role when limits can be bypassed despite no seats", () => {
    const options = ["ADMIN", "STAFF_LEADER", "STAFF", "AGENT"] as const;

    options.forEach((option) => {
      expect(
        canAssignRoleOption({
          option,
          viewerRole: "ADMIN",
          canBypassLimits: true,
          hasAvailableSeats: false,
        })
      ).toBe(true);
    });
  });

  it("stops a staff leader from promoting anyone to admin", () => {
    expect(
      canAssignRoleOption({
        option: "ADMIN",
        viewerRole: "STAFF_LEADER",
        canBypassLimits: true,
        hasAvailableSeats: true,
      })
    ).toBe(false);
  });

  it("stops a staff member from promoting anyone to admin", () => {
    expect(
      canAssignRoleOption({
        option: "ADMIN",
        viewerRole: "STAFF",
        canBypassLimits: true,
        hasAvailableSeats: true,
      })
    ).toBe(false);
  });

  it("lets a staff leader assign non-admin roles", () => {
    expect(
      canAssignRoleOption({
        option: "STAFF",
        viewerRole: "STAFF_LEADER",
        canBypassLimits: true,
        hasAvailableSeats: true,
      })
    ).toBe(true);
  });
});
