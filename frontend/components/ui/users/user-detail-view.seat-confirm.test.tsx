import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Covers one behaviour of the Quick Edit role dropdown: it commits immediately
 * on select, so a change that spends a paid seat must be confirmed first.
 *
 * The seat arithmetic itself lives in roleChangeConsumesSeat and is tested in
 * lib/role-assignment.test.ts. What this pins is the wiring -- that the
 * component actually routes a seat-consuming change through the dialog instead
 * of firing the mutation.
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

describe("Quick Edit role change — paid seat confirmation", () => {
  it("asks before spending a seat, and does not change the role yet", async () => {
    render(<UserDetailView id="u-1" />);

    await chooseRole(/staff$/i);

    expect(
      await screen.findByText(/will use one of your paid seats/i)
    ).toBeInTheDocument();
    // The mutation must NOT have fired just because the dropdown closed.
    expect(mutate).not.toHaveBeenCalled();
  });

  it("tells the admin how many seats remain afterwards", async () => {
    render(<UserDetailView id="u-1" />);

    await chooseRole(/staff$/i);

    expect(await screen.findByText(/1 of 5 paid seats left/i)).toBeInTheDocument();
  });

  it("applies the change once confirmed", async () => {
    render(<UserDetailView id="u-1" />);

    await chooseRole(/staff$/i);
    await userEvent.click(
      await screen.findByRole("button", { name: /use a seat/i })
    );

    expect(mutate).toHaveBeenCalledTimes(1);
  });

  it("abandons the change on cancel", async () => {
    render(<UserDetailView id="u-1" />);

    await chooseRole(/staff$/i);
    await userEvent.click(
      await screen.findByRole("button", { name: /cancel/i })
    );

    expect(mutate).not.toHaveBeenCalled();
  });

  it("does not interrupt a seat-neutral change", async () => {
    // Already on a paid role: moving to another paid role costs nothing, so
    // prompting would be noise.
    user.value.role = "STAFF";
    render(<UserDetailView id="u-1" />);

    await chooseRole(/staff leader/i);

    expect(
      screen.queryByText(/will use one of your paid seats/i)
    ).not.toBeInTheDocument();
    expect(mutate).toHaveBeenCalledTimes(1);
  });
});
