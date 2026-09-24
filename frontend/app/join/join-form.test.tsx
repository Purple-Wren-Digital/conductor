import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { JoinForm } from "./join-form";
import { API_BASE } from "@/lib/api/utils";

// vi.mock factories are hoisted, so anything they close over must be too --
// a plain `let` here throws "Cannot access before initialization".
const { mockPush, search } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  search: { value: "" },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams(search.value),
}));

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ isSignedIn: true, getToken: async () => "token" }),
  SignUp: () => <div data-testid="clerk-signup" />,
}));

beforeEach(() => {
  vi.clearAllMocks();
  search.value = "";
  global.fetch = vi.fn();
});

describe("JoinForm", () => {
  it("shows the market center name for confirmation before joining", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        valid: true,
        marketCenterName: "Greater Austin Market Center",
      }),
    });

    render(<JoinForm />);
    await userEvent.type(screen.getByLabelText(/join code/i), "K7M42XQP");
    await userEvent.click(screen.getByRole("button", { name: /continue/i }));

    expect(
      await screen.findByText(/Greater Austin Market Center/)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /join market center/i })
    ).toBeInTheDocument();
  });

  it("joins with the confirmed code, not a stale or different one", async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          valid: true,
          marketCenterName: "Greater Austin Market Center",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          marketCenterId: "mc_1",
          marketCenterName: "Greater Austin Market Center",
        }),
      });

    render(<JoinForm />);
    await userEvent.type(screen.getByLabelText(/join code/i), "K7M42XQP");
    await userEvent.click(screen.getByRole("button", { name: /continue/i }));
    await screen.findByText(/Greater Austin Market Center/);

    await userEvent.click(
      screen.getByRole("button", { name: /join market center/i })
    );

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });

    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [joinUrl, joinOptions] = fetchMock.mock.calls[1];
    expect(joinUrl).toBe(`${API_BASE}/join-codes/K7M42XQP/join`);
    expect(joinOptions).toMatchObject({
      method: "POST",
      headers: expect.objectContaining({ Authorization: "Bearer token" }),
    });
  });

  it("shows a generic error for an invalid code", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ valid: false, marketCenterName: null }),
    });

    render(<JoinForm />);
    await userEvent.type(screen.getByLabelText(/join code/i), "ZZZZZZZZ");
    await userEvent.click(screen.getByRole("button", { name: /continue/i }));

    expect(await screen.findByText(/isn't valid/i)).toBeInTheDocument();
  });

  it("pre-fills the code from the query string", () => {
    search.value = "code=K7M42XQP";

    render(<JoinForm />);

    expect(screen.getByLabelText(/join code/i)).toHaveValue("K7M4-2XQP");
  });

  it("offers owners a route to pricing", () => {
    render(<JoinForm />);

    const link = screen.getByRole("link", { name: /setting up a new market center/i });
    expect(link).toHaveAttribute("href", "/pricing");
  });
});
