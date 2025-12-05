/**
 * SLA Service - Business logic for SLA operations
 */

import { slaRepository } from "../shared/repositories";
import type { Urgency, SlaPolicy } from "../ticket/types";

export const slaService = {
  /**
   * Calculate the SLA due date for a ticket based on urgency
   */
  async calculateSlaDueDate(
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
   * Set SLA for a ticket
   */
  async setTicketSla(
    ticketId: string,
    urgency: Urgency,
    createdAt: Date = new Date()
  ): Promise<boolean> {
    const slaData = await this.calculateSlaDueDate(urgency, createdAt);
    if (!slaData) {
      return false;
    }

    await slaRepository.setTicketSlaDueDate(
      ticketId,
      slaData.slaDueAt,
      slaData.policyId
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
   * Check if SLA was met for a ticket
   */
  async checkSlaMet(
    ticketId: string,
    slaDueAt: Date,
    firstResponseAt: Date
  ): Promise<boolean> {
    return firstResponseAt <= slaDueAt;
  },

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
    data: { responseTimeMinutes?: number; isActive?: boolean }
  ): Promise<SlaPolicy | null> {
    return slaRepository.updatePolicy(id, data);
  },

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
