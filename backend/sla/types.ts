import type { Urgency, SlaPolicy, SlaEventType } from "../ticket/types";

export interface SlaPolicyResponse {
  id: string;
  urgency: Urgency;
  responseTimeMinutes: number;
  resolutionTimeMinutes: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateSlaPolicyRequest {
  id: string;
  responseTimeMinutes?: number;
  resolutionTimeMinutes?: number;
  isActive?: boolean;
}

export interface SlaMetrics {
  totalTickets: number;
  ticketsWithSla: number;
  ticketsMet: number;
  ticketsBreached: number;
  complianceRate: number;
  avgResponseTimeMinutes: number | null;
}

export interface ResolutionSlaMetrics {
  totalTickets: number;
  ticketsWithSla: number;
  ticketsMet: number;
  ticketsBreached: number;
  complianceRate: number;
  avgResolutionTimeMinutes: number | null;
}

export interface SlaMetricsByUrgency {
  urgency: Urgency;
  totalTickets: number;
  ticketsMet: number;
  ticketsBreached: number;
  complianceRate: number;
}

export interface SlaMetricsByAssignee {
  assigneeId: string | null;
  assigneeName: string | null;
  totalTickets: number;
  ticketsMet: number;
  ticketsBreached: number;
  complianceRate: number;
  avgResponseTimeMinutes: number | null;
}

export interface SlaTrend {
  period: string;
  totalTickets: number;
  ticketsMet: number;
  ticketsBreached: number;
  complianceRate: number;
}

export interface SlaReportRequest {
  dateFrom?: string;
  dateTo?: string;
  assigneeId?: string;
  categoryId?: string;
  groupBy?: 'day' | 'week' | 'month';
}

export interface SlaReportResponse {
  // Response SLA
  metrics: SlaMetrics;
  byUrgency: SlaMetricsByUrgency[];
  byAssignee: SlaMetricsByAssignee[];
  trends: SlaTrend[];
  // Resolution SLA
  resolutionMetrics: ResolutionSlaMetrics;
  resolutionByUrgency: SlaMetricsByUrgency[];
  resolutionTrends: SlaTrend[];
}
