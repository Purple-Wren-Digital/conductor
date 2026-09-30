import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { UserListItem } from "./user-list-item";

vi.mock("@/hooks/use-user-role", () => ({
  useUserRole: () => ({ role: "ADMIN", permissions: {} }),
}));

vi.mock("@/hooks/use-market-center", () => ({
  useFetchMarketCenter: () => ({ data: { id: "mc-1", name: "Greater Austin" } }),
}));

vi.mock("@/hooks/use-tickets", () => ({
  useFetchRatingsByAssignee: () => ({ data: undefined }),
}));

const baseProps = {
  onClick: vi.fn(),
  onEdit: vi.fn(),
  onDelete: vi.fn(),
  deleteLabel: "Deactivate" as const,
};

const baseUser = {
  id: "user-1",
  name: "Jeffrey Harris",
  email: "jeffrey@example.com",
  role: "AGENT",
  isActive: true,
  marketCenterId: "mc-1",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
};

describe("UserListItem", () => {
  it("marks a user who joined with a code", () => {
    render(
      <UserListItem
        {...baseProps}
        user={{ ...baseUser, joinedViaJoinCode: true } as never}
      />
    );

    expect(screen.getByText(/joined via code/i)).toBeInTheDocument();
  });

  it("shows no marker for an invited user", () => {
    render(
      <UserListItem
        {...baseProps}
        user={{ ...baseUser, joinedViaJoinCode: false } as never}
      />
    );

    expect(screen.queryByText(/joined via code/i)).toBeNull();
  });
});
