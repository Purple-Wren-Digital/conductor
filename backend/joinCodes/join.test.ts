import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockJoinCodeRepository,
  mockUserRepository,
  mockNotificationRepository,
  mockGetUserContext,
  mockEnsureNotificationPreferences,
  mockCheckCanAddUser,
  mockTx,
  mockWithTransaction,
} = vi.hoisted(() => {
  const tx = { exec: vi.fn(), queryRow: vi.fn() };
  return {
    mockJoinCodeRepository: { findActiveByCode: vi.fn() },
    mockUserRepository: {
      findById: vi.fn(),
      findByMarketCenterIdAndRole: vi.fn(),
    },
    mockNotificationRepository: { createMany: vi.fn() },
    mockGetUserContext: vi.fn(),
    mockEnsureNotificationPreferences: vi.fn(),
    mockCheckCanAddUser: vi.fn(),
    mockTx: tx,
    // Runs the callback against the fake tx so the SQL is observable.
    mockWithTransaction: vi.fn(async (fn: (t: typeof tx) => Promise<void>) =>
      fn(tx)
    ),
  };
});

/** Flattens the tagged-template SQL the handler ran (both exec and queryRow calls), for assertions. */
function executedSql(): string {
  return [...mockTx.queryRow.mock.calls, ...mockTx.exec.mock.calls]
    .map((call) => (call[0] as TemplateStringsArray).join("?"))
    .join("\n");
}

vi.mock("encore.dev/api", () => ({
  api: vi.fn((_config, handler) => handler),
  APIError: {
    notFound: vi.fn((msg) => Object.assign(new Error(msg), { code: "not_found" })),
    failedPrecondition: vi.fn((msg) =>
      Object.assign(new Error(msg), { code: "failed_precondition" })
    ),
  },
}));

vi.mock("../shared/repositories", () => ({
  joinCodeRepository: mockJoinCodeRepository,
  userRepository: mockUserRepository,
  notificationRepository: mockNotificationRepository,
}));

vi.mock("../ticket/db", () => ({ withTransaction: mockWithTransaction }));

vi.mock("../auth/subscription-check", () => ({
  checkCanAddUser: mockCheckCanAddUser,
}));

vi.mock("../auth/user-context", () => ({
  getUserContext: mockGetUserContext,
  ensureNotificationPreferences: mockEnsureNotificationPreferences,
}));

import { joinWithCode } from "./join";

const ACTIVE_CODE = {
  id: "jc-1",
  marketCenterId: "mc-1",
  code: "K7M42XQP",
  marketCenterName: "Greater Austin Market Center",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUserContext.mockResolvedValue({
    userId: "user-1",
    name: "Jeffrey Harris",
    email: "jeffrey@example.com",
    role: "AGENT",
    marketCenterId: null,
    clerkId: "clerk-1",
    isSuperuser: false,
  });
  mockUserRepository.findById.mockResolvedValue({
    id: "user-1",
    isActive: true,
    marketCenterId: null,
  });
  mockJoinCodeRepository.findActiveByCode.mockResolvedValue(ACTIVE_CODE);
  mockUserRepository.findByMarketCenterIdAndRole.mockResolvedValue([]);
  // Default: the in-transaction gate finds the row still unclaimed and updates it.
  mockTx.queryRow.mockResolvedValue({ id: "user-1" });
});

describe("joinWithCode", () => {
  it("provisions the agent completely, in one transaction", async () => {
    const result = await joinWithCode({ code: "K7M4-2XQP" });

    expect(result).toEqual({
      marketCenterId: "mc-1",
      marketCenterName: "Greater Austin Market Center",
    });

    // Hyphenated entry must be normalized before it reaches the repository.
    expect(mockJoinCodeRepository.findActiveByCode).toHaveBeenCalledWith(
      "K7M42XQP"
    );

    expect(mockWithTransaction).toHaveBeenCalledTimes(1);
    expect(mockTx.queryRow).toHaveBeenCalledTimes(1);
    expect(mockTx.exec).toHaveBeenCalledTimes(2);

    const sql = executedSql();
    expect(sql).toContain("UPDATE users");
    expect(sql).toContain("market_center_id IS NULL");
    expect(sql).toContain("INSERT INTO user_market_centers");
    expect(sql).toContain("ON CONFLICT (user_id, market_center_id) DO NOTHING");
    expect(sql).toContain("INSERT INTO user_history");

    // Pin the bound values, not just the SQL shape — a regression that binds
    // userContext.marketCenterId (null) or any other id here would still pass
    // every string-only assertion above.
    const [updateCall] = mockTx.queryRow.mock.calls;
    expect(updateCall.slice(1)).toEqual(["mc-1", "user-1"]);

    const [junctionCall, historyCall] = mockTx.exec.mock.calls;
    expect(junctionCall.slice(1)).toEqual(["user-1", "mc-1"]);
    expect(historyCall.slice(1)).toEqual(["user-1", "mc-1", "user-1"]);

    expect(mockEnsureNotificationPreferences).toHaveBeenCalledWith("user-1");
  });

  it("rejects when the in-transaction gate finds the seat already taken (TOCTOU race)", async () => {
    // Simulates a concurrent request that committed first: the pre-check above
    // (mocked findById) still reports the user as unassigned, but the real
    // UPDATE's WHERE clause no longer matches.
    mockTx.queryRow.mockResolvedValue(null);

    await expect(joinWithCode({ code: "K7M42XQP" })).rejects.toThrow(
      "already a member"
    );

    // The loser must not write the junction row or history row, and must not
    // notify anyone — the whole transaction rolled back.
    expect(mockTx.exec).not.toHaveBeenCalled();
    expect(mockEnsureNotificationPreferences).not.toHaveBeenCalled();
    expect(mockNotificationRepository.createMany).not.toHaveBeenCalled();
  });

  it("a repeat call after the code was already consumed writes nothing twice", async () => {
    // First call claims the row; second call (double submit, or a second
    // concurrent request) finds it already claimed.
    mockTx.queryRow
      .mockResolvedValueOnce({ id: "user-1" })
      .mockResolvedValueOnce(null);
    mockUserRepository.findByMarketCenterIdAndRole.mockResolvedValueOnce([
      { id: "admin-1" },
    ]);

    await joinWithCode({ code: "K7M42XQP" });
    await expect(joinWithCode({ code: "K7M42XQP" })).rejects.toThrow(
      "already a member"
    );

    expect(mockTx.queryRow).toHaveBeenCalledTimes(2);

    const historyInserts = mockTx.exec.mock.calls.filter((call) =>
      (call[0] as TemplateStringsArray).join("?").includes("user_history")
    );
    expect(historyInserts).toHaveLength(1);
    expect(mockNotificationRepository.createMany).toHaveBeenCalledTimes(1);
  });

  it("still returns success if syncing notification preferences fails after commit", async () => {
    mockEnsureNotificationPreferences.mockRejectedValueOnce(new Error("boom"));

    const result = await joinWithCode({ code: "K7M42XQP" });

    expect(result).toEqual({
      marketCenterId: "mc-1",
      marketCenterName: "Greater Austin Market Center",
    });
  });

  it("still returns success if notifying leadership fails after commit", async () => {
    mockUserRepository.findByMarketCenterIdAndRole.mockRejectedValueOnce(
      new Error("boom")
    );

    const result = await joinWithCode({ code: "K7M42XQP" });

    expect(result).toEqual({
      marketCenterId: "mc-1",
      marketCenterName: "Greater Austin Market Center",
    });
  });

  it("writes the history row with the join-code marker", async () => {
    await joinWithCode({ code: "K7M42XQP" });

    const historyCall = mockTx.exec.mock.calls.find((call) =>
      (call[0] as TemplateStringsArray).join("?").includes("user_history")
    );
    expect(historyCall).toBeDefined();
    expect(historyCall!.join(" ")).toContain("Activated via Join Code");
  });

  it("notifies admins and staff leaders of the market center", async () => {
    mockUserRepository.findByMarketCenterIdAndRole.mockImplementation(
      async (_mcId: string, role: string) =>
        role === "ADMIN" ? [{ id: "admin-1" }] : [{ id: "leader-1" }]
    );

    await joinWithCode({ code: "K7M42XQP" });

    const [notifications] = mockNotificationRepository.createMany.mock.calls[0];
    expect(notifications.map((n: { userId: string }) => n.userId).sort()).toEqual([
      "admin-1",
      "leader-1",
    ]);
    expect(notifications[0].body).toContain("Jeffrey Harris");
    expect(notifications[0].body).toContain("Greater Austin Market Center");
  });

  it("rejects a code rotated away between resolve and join", async () => {
    mockJoinCodeRepository.findActiveByCode.mockResolvedValue(null);

    await expect(joinWithCode({ code: "K7M42XQP" })).rejects.toThrow(
      "That join code isn't valid"
    );
    expect(mockWithTransaction).not.toHaveBeenCalled();
  });

  it("rejects a user who already belongs to a market center", async () => {
    mockUserRepository.findById.mockResolvedValue({
      id: "user-1",
      isActive: true,
      marketCenterId: "mc-other",
    });

    await expect(joinWithCode({ code: "K7M42XQP" })).rejects.toThrow(
      "already a member"
    );
    expect(mockWithTransaction).not.toHaveBeenCalled();
  });

  it("refuses to reactivate a deactivated user", async () => {
    mockUserRepository.findById.mockResolvedValue({
      id: "user-1",
      isActive: false,
      marketCenterId: null,
    });

    await expect(joinWithCode({ code: "K7M42XQP" })).rejects.toThrow(
      "deactivated"
    );
    expect(mockWithTransaction).not.toHaveBeenCalled();
  });

  it("never consults the paid seat check — agents are free", async () => {
    await joinWithCode({ code: "K7M42XQP" });

    // This is the property that keeps agents free. If a future change routes the
    // join through checkCanAddUser, market centers at their seat limit silently
    // stop being able to onboard agents at all.
    expect(mockCheckCanAddUser).not.toHaveBeenCalled();
  });

  it("never grants a role other than AGENT", async () => {
    mockGetUserContext.mockResolvedValue({
      userId: "user-1",
      name: "Jeffrey Harris",
      email: "jeffrey@example.com",
      role: "ADMIN",
      marketCenterId: null,
      clerkId: "clerk-1",
      isSuperuser: false,
    });

    await joinWithCode({ code: "K7M42XQP" });

    expect(executedSql()).toContain("role = 'AGENT'");
  });
});
