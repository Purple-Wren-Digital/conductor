import { describe, it, expect } from "vitest";
import { canAssignRoleOption, roleChangeConsumesSeat } from "./utils";

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

  // A role change only costs a seat when it moves someone OFF the free AGENT
  // role. Blocking seat-neutral changes strands admins at the seat limit.
  it("allows a seat-neutral change when seats are full", () => {
    expect(
      canAssignRoleOption({
        option: "STAFF_LEADER",
        currentRole: "STAFF",
        viewerRole: "ADMIN",
        canBypassLimits: false,
        hasAvailableSeats: false,
      })
    ).toBe(true);
  });

  it("still blocks promoting an agent when seats are full", () => {
    expect(
      canAssignRoleOption({
        option: "STAFF",
        currentRole: "AGENT",
        viewerRole: "ADMIN",
        canBypassLimits: false,
        hasAvailableSeats: false,
      })
    ).toBe(false);
  });

  it("always offers the role the user already has", () => {
    // Otherwise the dropdown omits their current role, misrepresenting state
    // and making every selection a change.
    expect(
      canAssignRoleOption({
        option: "ADMIN",
        currentRole: "ADMIN",
        viewerRole: "ADMIN",
        canBypassLimits: false,
        hasAvailableSeats: false,
      })
    ).toBe(true);
  });

  it("still lets a full market center demote someone to agent", () => {
    expect(
      canAssignRoleOption({
        option: "AGENT",
        currentRole: "STAFF",
        viewerRole: "ADMIN",
        canBypassLimits: false,
        hasAvailableSeats: false,
      })
    ).toBe(true);
  });

});

describe("roleChangeConsumesSeat", () => {
  it("costs a seat when promoting an agent", () => {
    expect(roleChangeConsumesSeat("AGENT", "STAFF")).toBe(true);
    expect(roleChangeConsumesSeat("AGENT", "ADMIN")).toBe(true);
  });

  it("costs nothing moving between paid roles", () => {
    expect(roleChangeConsumesSeat("STAFF", "STAFF_LEADER")).toBe(false);
    expect(roleChangeConsumesSeat("ADMIN", "STAFF")).toBe(false);
  });

  it("costs nothing demoting to agent", () => {
    expect(roleChangeConsumesSeat("STAFF", "AGENT")).toBe(false);
  });

  it("treats a brand-new user as starting from agent", () => {
    expect(roleChangeConsumesSeat(null, "STAFF")).toBe(true);
    expect(roleChangeConsumesSeat(undefined, "AGENT")).toBe(false);
  });
});
