/**
 * SLA Service - Business logic for SLA operations
 */

import { slaRepository } from "../shared/repositories";
import type { Urgency, SlaPolicy } from "../ticket/types";

export const slaService = {
  // ==================
  // Response SLA
  // ==================

  /**
   * Calculate the Response SLA due date for a ticket based on urgency
   */
  async calculateResponseSlaDueDate(
    urgency: Urgency,
    createdAt: Date = new Date()
  ): Promise<{ slaDueAt: Date; policyId: string } | null> {
    const policy = await slaRepository.findPolicyByUrgency(urgency);
    if (!policy) {
      return null;
    }

    const slaDueAt = new Date(createdAt);
    slaDueAt.setMinutes(slaDueAt.getMinutes() + policy.responseTimeMinutes);

    return {
      slaDueAt,
      policyId: policy.id,
    };
  },

  /**
   * Calculate the Resolution SLA due date for a ticket based on urgency
   */
  async calculateResolutionSlaDueDate(
    urgency: Urgency,
    createdAt: Date = new Date()
  ): Promise<{ slaResolutionDueAt: Date } | null> {
    const policy = await slaRepository.findPolicyByUrgency(urgency);
    if (!policy) {
      return null;
    }

    const slaResolutionDueAt = new Date(createdAt);
    slaResolutionDueAt.setMinutes(slaResolutionDueAt.getMinutes() + policy.resolutionTimeMinutes);

    return {
      slaResolutionDueAt,
    };
  },

  /**
   * @deprecated Use calculateResponseSlaDueDate instead
   */
  async calculateSlaDueDate(
    urgency: Urgency,
    createdAt: Date = new Date()
  ): Promise<{ slaDueAt: Date; policyId: string } | null> {
    return this.calculateResponseSlaDueDate(urgency, createdAt);
  },

  /**
   * Set both Response and Resolution SLA for a ticket
   */
  async setTicketSla(
    ticketId: string,
    urgency: Urgency,
    createdAt: Date = new Date()
  ): Promise<boolean> {
    const responseSlaData = await this.calculateResponseSlaDueDate(urgency, createdAt);
    const resolutionSlaData = await this.calculateResolutionSlaDueDate(urgency, createdAt);

    if (!responseSlaData || !resolutionSlaData) {
      return false;
    }

    // Set response SLA
    await slaRepository.setTicketSlaDueDate(
      ticketId,
      responseSlaData.slaDueAt,
      responseSlaData.policyId
    );

    // Set resolution SLA
    await slaRepository.setTicketResolutionSlaDueDate(
      ticketId,
      resolutionSlaData.slaResolutionDueAt
    );

    return true;
  },

  /**
   * Record the first response on a ticket (staff assignment or comment)
   */
  async recordFirstResponse(ticketId: string): Promise<void> {
    await slaRepository.recordFirstResponse(ticketId, new Date());
  },

  /**
   * Check if Response SLA was met for a ticket
   */
  async checkResponseSlaMet(
    slaDueAt: Date,
    firstResponseAt: Date
  ): Promise<boolean> {
    return firstResponseAt <= slaDueAt;
  },

  /**
   * @deprecated Use checkResponseSlaMet instead
   */
  async checkSlaMet(
    ticketId: string,
    slaDueAt: Date,
    firstResponseAt: Date
  ): Promise<boolean> {
    return this.checkResponseSlaMet(slaDueAt, firstResponseAt);
  },

  // ==================
  // Resolution SLA
  // ==================

  /**
   * Record resolution time for a ticket
   */
  async recordResolution(ticketId: string): Promise<void> {
    await slaRepository.recordResolution(ticketId, new Date());
  },

  /**
   * Check if Resolution SLA was met for a ticket
   */
  async checkResolutionSlaMet(
    slaResolutionDueAt: Date,
    resolvedAt: Date
  ): Promise<boolean> {
    return resolvedAt <= slaResolutionDueAt;
  },

  // ==================
  // Policy Management
  // ==================

  /**
   * Get all SLA policies
   */
  async getAllPolicies(): Promise<SlaPolicy[]> {
    return slaRepository.findAllPolicies();
  },

  /**
   * Update an SLA policy
   */
  async updatePolicy(
    id: string,
    data: {
      responseTimeMinutes?: number;
      resolutionTimeMinutes?: number;
      isActive?: boolean
    }
  ): Promise<SlaPolicy | null> {
    return slaRepository.updatePolicy(id, data);
  },

  // ==================
  // Utilities
  // ==================

  /**
   * Format minutes into human-readable duration
   */
  formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    }
    return `${hours} hour${hours !== 1 ? 's' : ''} ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
  },
};
