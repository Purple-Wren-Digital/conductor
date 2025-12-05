import type { Urgency } from "../ticket/types";

export type SLARule = {
  priority: Urgency;
  targetResolutionHours: number; // hours to resolve ticket
  atRiskThresholdHours: number; // hours before SLA breach
};

export type SLAStatus = "compliant" | "onTrack" | "atRisk" | "overdue";
