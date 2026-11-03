import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Covers the Quick Edit role dropdown: selecting a role applies it straight
 * away, with no confirmation step.
 *
 * A seat-consuming promotion used to open a dialog warning that it would spend
 * a paid seat. The client asked for it to go: a market center pays a flat rate
 * for its included seats, so at 5 of 50 the prompt announced a cost that had
 * not been incurred and read as a limit that did not apply.
 *
 * What is pinned here is that no confirmation returns by accident. The dropdown
 * still hides roles that are genuinely unavailable -- that filtering lives in
 * canAssignRoleOption and is tested in lib/role-assignment.test.ts.
 */
// jsdom has no matchMedia; Radix needs it. Same stub the ticket-form tests use.
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

const { mutate, user, subscription } = vi.hoisted(() => ({
  mutate: vi.fn(),
  user: {
    value: {
      id: "u-1",
      name: "Jeffrey Harris",
      email: "jeffrey@example.com",
      role: "AGENT",
      isActive: true,
      marketCenterId: "mc-1",
    },
  },
  // 3 of 5 paid seats used, so a promotion is allowed but costs one.
  subscription: { value: { status: "ACTIVE", totalSeats: 5, usedSeats: 3 } },
}));

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ getToken: async () => "token" }),
}));
vi.mock("@/context/store-provider", () => ({
  useStore: () => ({ currentUser: { id: "admin-1" }, setCurrentUser: vi.fn() }),
}));
vi.mock("@/hooks/use-user-role", () => ({
  useUserRole: () => ({
    role: "ADMIN",
    isSuperuser: false,
    permissions: { canChangeUserRoles: true, canManageTeam: true },
  }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@tanstack/react-query", () => ({
  useMutation: () => ({ mutate, isPending: false }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  // Child history tables fetch with useQuery; they are not under test here.
  useQuery: () => ({ data: undefined, isLoading: false, isError: false }),
  useInfiniteQuery: () => ({
    data: undefined,
    isLoading: false,
    fetchNextPage: vi.fn(),
    hasNextPage: false,
  }),
}));
vi.mock("@/hooks/use-tickets", () => ({
  useFetchRatingsByAssignee: () => ({ data: undefined }),
}));
vi.mock("@/hooks/use-market-center", () => ({
  useFetchAllMarketCenters: () => ({ data: undefined, isLoading: false }),
  useFetchMarketCenter: () => ({ data: undefined }),
}));
vi.mock("@/hooks/use-users", () => ({
  useFetchOneUser: () => ({ data: { user: user.value }, isLoading: false }),
}));
vi.mock("@/hooks/useSubscription", () => ({
  useIsEnterprise: () => ({ isEnterprise: false }),
  useSubscription: () => ({ data: subscription.value, isLoading: false }),
}));

import UserDetailView from "./user-detail-view";

beforeEach(() => {
  vi.clearAllMocks();
  user.value.role = "AGENT";
});

/** Picks a role from the Quick Edit dropdown. */
async function chooseRole(name: RegExp) {
  const combos = screen.getAllByRole("combobox");
  await userEvent.click(combos[0]);
  await userEvent.click(await screen.findByRole("option", { name }));
}

describe("Quick Edit role change", () => {
  it("applies a seat-consuming promotion immediately", async () => {
    render(<UserDetailView id="u-1" />);

    await chooseRole(/staff$/i);

    // Previously this opened a dialog and withheld the mutation.
    expect(mutate).toHaveBeenCalledTimes(1);
  });

  it("does not warn that a paid seat is being used", async () => {
    render(<UserDetailView id="u-1" />);

    await chooseRole(/staff$/i);

    // The "N out of M paid seats used" counter elsewhere on the page is a
    // status label, not a prompt, and is deliberately left alone.
    expect(
      screen.queryByText(/will use one of your paid seats/i)
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /use a seat/i })
    ).not.toBeInTheDocument();
  });

  it("applies a seat-neutral change", async () => {
    // Already on a paid role, so nothing about the seat count changes.
    user.value.role = "STAFF";
    render(<UserDetailView id="u-1" />);

    await chooseRole(/staff leader/i);

    expect(mutate).toHaveBeenCalledTimes(1);
  });
});
