import { describe, it, expect } from "vitest";
import { detectUserEdits, initEditUserFormData } from "./user-edit-utils";
import type { UserEditFormData } from "@/lib/types";

const baseUser = {
  name: "John Doe",
  email: "john@example.com",
  role: "AGENT" as const,
  marketCenterId: "mc-1",
};

const baseFormData: UserEditFormData = {
  firstName: "John",
  lastName: "Doe",
  email: "john@example.com",
  role: "AGENT",
  marketCenterId: "mc-1",
};

describe("detectUserEdits", () => {
  it("detects no changes when form matches user", () => {
    const result = detectUserEdits("John Doe", baseFormData, baseUser);
    expect(result.userUpdatesMade).toBe(false);
    expect(result.hasNameChanged).toBe(false);
    expect(result.hasEmailChanged).toBe(false);
    expect(result.hasRoleChanged).toBe(false);
    expect(result.hasMarketCenterChanged).toBe(false);
  });

  it("detects market center change as a valid update", () => {
    const formData = { ...baseFormData, marketCenterId: "mc-2" };
    const result = detectUserEdits("John Doe", formData, baseUser);
    expect(result.userUpdatesMade).toBe(true);
    expect(result.hasMarketCenterChanged).toBe(true);
    expect(result.hasNameChanged).toBe(false);
    expect(result.hasEmailChanged).toBe(false);
    expect(result.hasRoleChanged).toBe(false);
  });

  it("detects assigning unassigned user to a market center", () => {
    const unassignedUser = { ...baseUser, marketCenterId: null };
    const formData = { ...baseFormData, marketCenterId: "mc-1" };
    const result = detectUserEdits("John Doe", formData, unassignedUser);
    expect(result.userUpdatesMade).toBe(true);
    expect(result.hasMarketCenterChanged).toBe(true);
  });

  it("detects removing user from market center", () => {
    const formData = { ...baseFormData, marketCenterId: "" };
    const result = detectUserEdits("John Doe", formData, baseUser);
    expect(result.userUpdatesMade).toBe(true);
    expect(result.hasMarketCenterChanged).toBe(true);
  });

  it("detects name change", () => {
    const result = detectUserEdits("Jane Doe", baseFormData, baseUser);
    expect(result.userUpdatesMade).toBe(true);
    expect(result.hasNameChanged).toBe(true);
  });

  it("detects email change", () => {
    const formData = { ...baseFormData, email: "jane@example.com" };
    const result = detectUserEdits("John Doe", formData, baseUser);
    expect(result.userUpdatesMade).toBe(true);
    expect(result.hasEmailChanged).toBe(true);
  });

  it("detects role change", () => {
    const formData = { ...baseFormData, role: "STAFF" as const };
    const result = detectUserEdits("John Doe", formData, baseUser);
    expect(result.userUpdatesMade).toBe(true);
    expect(result.hasRoleChanged).toBe(true);
  });

  it("handles null editing user", () => {
    const result = detectUserEdits("John Doe", baseFormData, null);
    expect(result.userUpdatesMade).toBe(true);
  });

  it("treats undefined and empty marketCenterId as equivalent", () => {
    const formData = { ...baseFormData, marketCenterId: "" };
    const user = { ...baseUser, marketCenterId: null };
    const result = detectUserEdits("John Doe", formData, user);
    expect(result.hasMarketCenterChanged).toBe(false);
  });
});

describe("initEditUserFormData", () => {
  it("initializes all fields including marketCenterId", () => {
    const result = initEditUserFormData(baseUser);
    expect(result).toEqual({
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      role: "AGENT",
      marketCenterId: "mc-1",
    });
  });

  it("sets marketCenterId to empty string when user has null", () => {
    const user = { ...baseUser, marketCenterId: null };
    const result = initEditUserFormData(user);
    expect(result.marketCenterId).toBe("");
  });

  it("handles user with no name", () => {
    const user = { ...baseUser, name: null };
    const result = initEditUserFormData(user);
    expect(result.firstName).toBe("");
    expect(result.lastName).toBe("");
  });

  it("handles single-word name", () => {
    const user = { ...baseUser, name: "John" };
    const result = initEditUserFormData(user);
    expect(result.firstName).toBe("John");
    expect(result.lastName).toBeUndefined();
  });
});
