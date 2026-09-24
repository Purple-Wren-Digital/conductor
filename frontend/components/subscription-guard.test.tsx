import { render, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SubscriptionGuard } from "./subscription-guard";

const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => "/dashboard",
}));

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({
    isLoaded: true,
    isSignedIn: true,
    getToken: async () => "token",
  }),
}));

vi.mock("@/lib/api/utils", () => ({
  API_BASE: "http://api.test",
  fetchWithTimeout: vi.fn(),
}));

import { fetchWithTimeout } from "@/lib/api/utils";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("SubscriptionGuard", () => {
  it("sends a user with no market center to /join, not the pricing page", async () => {
    vi.mocked(fetchWithTimeout).mockImplementation(async (url: string) => {
      if (url.includes("/users/me")) {
        return {
          ok: true,
          json: async () => ({ isSuperuser: false, marketCenterId: null }),
        } as Response;
      }
      return { ok: false, status: 404 } as Response;
    });

    render(
      <SubscriptionGuard>
        <div>content</div>
      </SubscriptionGuard>
    );

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/join"));
  });

  it("lets an invited user with a market center through", async () => {
    vi.mocked(fetchWithTimeout).mockImplementation(async (url: string) => {
      if (url.includes("/users/me")) {
        return {
          ok: true,
          json: async () => ({ isSuperuser: false, marketCenterId: "mc-1" }),
        } as Response;
      }
      return { ok: false, status: 404 } as Response;
    });

    const { findByText } = render(
      <SubscriptionGuard>
        <div>content</div>
      </SubscriptionGuard>
    );

    expect(await findByText("content")).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
