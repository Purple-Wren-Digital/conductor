import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import JoinCodeSettings from "./join-code-settings";

// vi.mock factories are hoisted, so anything they close over must be too --
// a plain `let`/`const` here throws "Cannot access before initialization".
// Clerk's real useAuth() returns a stable getToken across renders; this
// double is hoisted to a single shared function so it reflects that instead
// of manufacturing a new identity on every call.
const { getToken, store, toastMock } = vi.hoisted(() => ({
  getToken: vi.fn(async () => "token"),
  store: { currentUser: { marketCenterId: "mc-1" } as { marketCenterId: string | null } },
  toastMock: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ getToken }),
}));

vi.mock("@/context/store-provider", () => ({
  useStore: () => store,
}));

vi.mock("sonner", () => ({ toast: toastMock }));

const mockUseUserRole = vi.fn();
vi.mock("@/hooks/use-user-role", () => ({
  useUserRole: () => mockUseUserRole(),
}));

vi.mock("@/lib/api/utils", () => ({ API_BASE: "http://api.test" }));

beforeEach(() => {
  vi.clearAllMocks();
  store.currentUser = { marketCenterId: "mc-1" };
  mockUseUserRole.mockReturnValue({ role: "ADMIN" });
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ code: "K7M42XQP", formattedCode: "K7M4-2XQP" }),
  });
});

describe("JoinCodeSettings", () => {
  it("shows the market center's active join code", async () => {
    render(<JoinCodeSettings />);

    expect(await screen.findByText("K7M4-2XQP")).toBeInTheDocument();
  });

  it("fetches the join code exactly once on mount", async () => {
    render(<JoinCodeSettings />);

    await screen.findByText("K7M4-2XQP");

    // Guards against the effect re-running on every render (e.g. because it
    // depends on a third-party function identity like getToken instead of
    // marketCenterId/role) and silently refetching in a loop.
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      "http://api.test/marketCenters/mc-1/join-code",
      expect.objectContaining({
        headers: { Authorization: "Bearer token" },
      })
    );
  });

  it("requires confirmation before rotating", async () => {
    render(<JoinCodeSettings />);
    await screen.findByText("K7M4-2XQP");

    await userEvent.click(screen.getByRole("button", { name: /rotate/i }));

    expect(await screen.findByText(/stop working immediately/i)).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledTimes(1); // still only the initial read
  });

  it("hides rotation from staff leaders", async () => {
    mockUseUserRole.mockReturnValue({ role: "STAFF_LEADER" });

    render(<JoinCodeSettings />);
    await screen.findByText("K7M4-2XQP");

    expect(screen.queryByRole("button", { name: /rotate/i })).toBeNull();
  });

  it("renders nothing, and fetches nothing, for agents and staff", async () => {
    for (const role of ["AGENT", "STAFF"]) {
      mockUseUserRole.mockReturnValue({ role });

      const { container } = render(<JoinCodeSettings />);

      expect(container).toBeEmptyDOMElement();
    }
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("stops loading for an admin with no market center instead of spinning forever", async () => {
    // An ADMIN passes the role gate with a null market center -- a superuser,
    // or anyone whose market center was deleted (ON DELETE SET NULL). The early
    // return used to skip setIsLoading(false), leaving a permanent spinner and
    // no way to tell it apart from a hung request.
    store.currentUser = { marketCenterId: null };

    render(<JoinCodeSettings />);

    expect(await screen.findByText(/no join code is available/i)).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: /copy join link/i })).toBeNull();
  });

  it("does not claim the link was copied when the clipboard write fails", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    render(<JoinCodeSettings />);
    await screen.findByText("K7M4-2XQP");

    await userEvent.click(screen.getByRole("button", { name: /copy join link/i }));

    await waitFor(() => expect(toastMock.error).toHaveBeenCalled());
    expect(toastMock.success).not.toHaveBeenCalled();
  });

  it("tells the admin when the clipboard is unavailable rather than throwing", async () => {
    // navigator.clipboard is undefined outside a secure context; an unguarded
    // writeText throws a TypeError straight out of the click handler.
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      configurable: true,
    });

    render(<JoinCodeSettings />);
    await screen.findByText("K7M4-2XQP");

    await userEvent.click(screen.getByRole("button", { name: /copy join link/i }));

    expect(toastMock.error).toHaveBeenCalled();
    expect(toastMock.success).not.toHaveBeenCalled();
  });

  it("tells the admin where agents enter the code, not just the code", async () => {
    render(<JoinCodeSettings />);
    await screen.findByText("K7M4-2XQP");

    // A code shared by phone or newsletter is useless without the destination,
    // and the URL otherwise exists only inside the Copy button's handler.
    expect(
      screen.getByText(`${window.location.origin}/join`)
    ).toBeInTheDocument();
  });

});
