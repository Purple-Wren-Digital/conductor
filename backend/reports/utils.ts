import type { SLAStatus } from "./types";

export const generalSlaRule = {
  targetResolutionHours: 80, // default SLA if dueDate not provided
  atRiskThresholdHours: 6, // if due within 6 hours → at risk
};
const MS_PER_HOUR = 3600000;

export function getTicketSlaStatus(ticket: {
  createdAt: Date | string;
  dueDate?: Date | string | null;
  resolvedAt?: Date | string | null;
}): SLAStatus {
  const { targetResolutionHours, atRiskThresholdHours } = generalSlaRule;

  const createdMs = ticket?.createdAt
    ? new Date(ticket?.createdAt).getTime()
    : NaN;
  if (isNaN(createdMs)) {
    throw new Error("Invalid createdAt on ticket");
  }

  const dueAtMs = ticket?.dueDate
    ? new Date(ticket.dueDate).getTime()
    : createdMs + targetResolutionHours * MS_PER_HOUR;

  if (isNaN(dueAtMs)) {
    throw new Error("Invalid dueDate on ticket");
  }

  const atRiskStartMs = dueAtMs - atRiskThresholdHours * MS_PER_HOUR;

  if (ticket?.resolvedAt) {
    const resolvedMs = new Date(ticket.resolvedAt).getTime();
    if (isNaN(resolvedMs)) {
      throw new Error("Invalid resolvedAt on ticket");
    }
    return resolvedMs <= dueAtMs ? "compliant" : "overdue";
  }

  const nowMs = Date.now();

  if (nowMs >= dueAtMs) return "overdue";
  if (nowMs >= atRiskStartMs) return "atRisk";
  return "onTrack";
}
