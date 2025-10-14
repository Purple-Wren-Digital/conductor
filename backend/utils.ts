export function mapHistorySnapshot(history: any[]): any[] {
  return history.map((h) => ({
    ...h,
    snapshot: h.snapshot ?? undefined,
  }));
}

export function mapUser(user: any) {
  if (!user) return user;
  return {
    ...user,
    ticketHistory: mapHistorySnapshot(user.ticketHistory),
  };
}
