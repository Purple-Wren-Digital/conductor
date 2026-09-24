import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import JoinCodeSettings from "./join-code-settings";

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ getToken: async () => "token" }),
}));

vi.mock("@/context/store-provider", () => ({
  useStore: () => ({ currentUser: { marketCenterId: "mc-1" } }),
}));

const mockUseUserRole = vi.fn();
vi.mock("@/hooks/use-user-role", () => ({
  useUserRole: () => mockUseUserRole(),
}));

vi.mock("@/lib/api/utils", () => ({ API_BASE: "http://api.test" }));

beforeEach(() => {
  vi.clearAllMocks();
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
});
