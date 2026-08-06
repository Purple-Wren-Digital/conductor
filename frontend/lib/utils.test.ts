import { describe, it, expect } from "vitest";
import { mergeAssigneeOptions, type AssigneeOption } from "./utils";

describe("mergeAssigneeOptions", () => {
  it("returns the staff list untouched when there are no extra assignees", () => {
    const staff: AssigneeOption[] = [
      { id: "u-1", name: "Bob Staff", role: "STAFF" },
    ];

    const result = mergeAssigneeOptions(staff, []);

    expect(result).toEqual([
      { id: "u-1", name: "Bob Staff", role: "STAFF", isActive: true },
    ]);
  });

  it("adds an assignee who is missing from the active staff roster", () => {
    const staff: AssigneeOption[] = [
      { id: "u-1", name: "Bob Staff", role: "STAFF" },
    ];
    const assignees: AssigneeOption[] = [
      { id: "u-2", name: "Carla Assignee", role: "STAFF", isActive: true },
    ];

    const result = mergeAssigneeOptions(staff, assignees);

    expect(result.map((u) => u.id)).toEqual(["u-1", "u-2"]);
  });

  it("dedupes by id, preferring the staff roster's data on conflict", () => {
    const staff: AssigneeOption[] = [
      { id: "u-1", name: "Bob Staff (current)", role: "STAFF_LEADER" },
    ];
    const assignees: AssigneeOption[] = [
      { id: "u-1", name: "Bob Staff (stale)", role: "STAFF", isActive: false },
    ];

    const result = mergeAssigneeOptions(staff, assignees);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: "u-1",
      name: "Bob Staff (current)",
      role: "STAFF_LEADER",
      isActive: true,
    });
  });

  it("surfaces a fetched assignee who changed role to AGENT", () => {
    // Regression: a user who was STAFF and got 3 tickets assigned, then
    // switched to AGENT, must still show up in the assignee filter even
    // though the active staff roster now excludes AGENT-role users.
    const staff: AssigneeOption[] = [];
    const assignees: AssigneeOption[] = [
      { id: "u-april", name: "April Huang", role: "AGENT", isActive: true },
    ];

    const result = mergeAssigneeOptions(staff, assignees);

    expect(result).toEqual([
      { id: "u-april", name: "April Huang", role: "AGENT", isActive: true },
    ]);
  });

  it("surfaces a fetched assignee who was deactivated", () => {
    const staff: AssigneeOption[] = [
      { id: "u-1", name: "Active Staff", role: "STAFF" },
    ];
    const assignees: AssigneeOption[] = [
      { id: "u-2", name: "Deactivated Staff", role: "STAFF", isActive: false },
    ];

    const result = mergeAssigneeOptions(staff, assignees);

    expect(result.find((u) => u.id === "u-2")).toEqual({
      id: "u-2",
      name: "Deactivated Staff",
      role: "STAFF",
      isActive: false,
    });
  });

  it("sorts the merged result by role then name", () => {
    const staff: AssigneeOption[] = [
      { id: "u-admin", name: "Zed Admin", role: "ADMIN" },
    ];
    const assignees: AssigneeOption[] = [
      { id: "u-agent", name: "Amy Agent", role: "AGENT", isActive: true },
      { id: "u-staff", name: "Sam Staff", role: "STAFF", isActive: true },
    ];

    const result = mergeAssigneeOptions(staff, assignees);

    expect(result.map((u) => u.id)).toEqual(["u-agent", "u-staff", "u-admin"]);
  });

  it("returns an empty array when both inputs are empty", () => {
    expect(mergeAssigneeOptions([], [])).toEqual([]);
  });

  it("ignores entries without an id", () => {
    const staff = [{ name: "No Id", role: "STAFF" } as AssigneeOption];
    const assignees = [{ name: "Also No Id", role: "AGENT" } as AssigneeOption];

    expect(mergeAssigneeOptions(staff, assignees)).toEqual([]);
  });
});
