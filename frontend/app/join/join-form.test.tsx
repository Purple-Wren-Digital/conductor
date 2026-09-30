import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { JoinForm } from "./join-form";
import { API_BASE } from "@/lib/api/utils";

// vi.mock factories are hoisted, so anything they close over must be too --
// a plain `let` here throws "Cannot access before initialization".
const { mockPush, search, auth } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  search: { value: "" },
  auth: { isSignedIn: true, isLoaded: true },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams(search.value),
}));

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({
    isSignedIn: auth.isSignedIn,
    isLoaded: auth.isLoaded,
    getToken: async () => "token",
  }),
  SignUp: (props: {
    forceRedirectUrl?: string;
    signInForceRedirectUrl?: string;
  }) => (
    <div
      data-testid="clerk-signup"
      data-force-redirect={props.forceRedirectUrl}
      data-sign-in-redirect={props.signInForceRedirectUrl}
    />
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
  search.value = "";
  auth.isSignedIn = true;
  auth.isLoaded = true;
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

  it("joins the code that was resolved, even if the input changes before the response returns", async () => {
    let resolveGet: (value: unknown) => void = () => {};
    const pendingGet = new Promise((resolve) => {
      resolveGet = resolve;
    });

    (global.fetch as ReturnType<typeof vi.fn>)
      .mockImplementationOnce(() => pendingGet)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          marketCenterId: "mc_1",
          marketCenterName: "Greater Austin Market Center",
        }),
      });

    render(<JoinForm />);
    const input = screen.getByLabelText(/join code/i);
    await userEvent.type(input, "K7M42XQP");
    await userEvent.click(screen.getByRole("button", { name: /continue/i }));

    // The GET for K7M42XQP is still in flight. Something changes the code
    // underneath it (edit, or a query-string change) before the response
    // resolves. Using fireEvent rather than userEvent here deliberately: the
    // point of this test is the state-locking logic, not whether the input's
    // disabled attribute blocks a keystroke.
    fireEvent.change(input, { target: { value: "ZZZZ9999" } });

    resolveGet({
      ok: true,
      json: async () => ({
        valid: true,
        marketCenterName: "Greater Austin Market Center",
      }),
    });

    await screen.findByText(/Greater Austin Market Center/);
    await userEvent.click(
      screen.getByRole("button", { name: /join market center/i })
    );

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });

    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [joinUrl] = fetchMock.mock.calls[1];
    expect(joinUrl).toBe(`${API_BASE}/join-codes/K7M42XQP/join`);
  });

  it("shows a distinct error when the code check itself fails, not 'isn't valid'", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    });

    render(<JoinForm />);
    await userEvent.type(screen.getByLabelText(/join code/i), "K7M42XQP");
    await userEvent.click(screen.getByRole("button", { name: /continue/i }));

    expect(
      await screen.findByText(/couldn't check that code/i)
    ).toBeInTheDocument();
    expect(screen.queryByText(/isn't valid/i)).not.toBeInTheDocument();
  });

  it("renders sign-up for agents without an account, carrying the resolved code", async () => {
    auth.isSignedIn = false;
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
    await screen.findByText(/Greater Austin Market Center/);

    const signUp = screen.getByTestId("clerk-signup");
    expect(signUp).toHaveAttribute("data-force-redirect", "/join?code=K7M42XQP");
    expect(signUp).toHaveAttribute(
      "data-sign-in-redirect",
      "/join?code=K7M42XQP"
    );
    expect(
      screen.queryByRole("button", { name: /join market center/i })
    ).not.toBeInTheDocument();
  });

  it("returns from sign-up to the entry step, pre-filled, rather than a dead end", () => {
    search.value = "code=K7M42XQP";

    render(<JoinForm />);

    expect(screen.getByLabelText(/join code/i)).toHaveValue("K7M4-2XQP");
    expect(
      screen.getByRole("button", { name: /continue/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /join market center/i })
    ).not.toBeInTheDocument();
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

  it("shows neither the join button nor sign-up while Clerk is still hydrating", async () => {
    // Clerk reports isSignedIn === false until it has loaded. Branching on
    // isSignedIn alone flashes the sign-up form at an agent who is already
    // signed in -- now reachable on the primary path, since /join is public.
    auth.isLoaded = false;
    auth.isSignedIn = false;
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
    await screen.findByText(/Greater Austin Market Center/);

    expect(
      screen.queryByRole("button", { name: /join market center/i })
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId("clerk-signup")).not.toBeInTheDocument();
  });

  it("announces the error to screen readers, not just visually", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ valid: false, marketCenterName: null }),
    });

    render(<JoinForm />);
    await userEvent.type(screen.getByLabelText(/join code/i), "ZZZZZZZZ");
    await userEvent.click(screen.getByRole("button", { name: /continue/i }));

    // This paragraph is the only signal a rejected code produces, on a public
    // page reached by people who have never used the product. Without a live
    // region the page looks unchanged to a screen reader.
    expect(await screen.findByRole("alert")).toHaveTextContent(/isn't valid/i);
  });

  it("offers an existing account holder a sign-in path carrying the code", async () => {
    auth.isSignedIn = false;
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

    const signIn = await screen.findByRole("link", { name: /sign in instead/i });
    // Must carry the CONFIRMED code, so the round trip returns to the same
    // market center rather than a blank form.
    expect(signIn).toHaveAttribute(
      "href",
      `/sign-in?redirect_url=${encodeURIComponent("/join?code=K7M42XQP")}`
    );
  });

});
