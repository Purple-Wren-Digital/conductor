/**
 * SLA Policy Management API
 */

import { api, APIError } from "encore.dev/api";
import { getUserContext } from "../auth/user-context";
import { slaRepository } from "../shared/repositories";
import type { SlaPolicyResponse, UpdateSlaPolicyRequest } from "./types";

interface GetPoliciesResponse {
  policies: SlaPolicyResponse[];
}

/**
 * Get all SLA policies
 */
export const getPolicies = api<{}, GetPoliciesResponse>(
  {
    expose: true,
    method: "GET",
    path: "/sla/policies",
    auth: true,
  },
  async () => {
    const userContext = await getUserContext();

    // Only ADMIN and STAFF_LEADER can view SLA policies
    if (userContext.role !== "ADMIN" && userContext.role !== "STAFF_LEADER") {
      throw APIError.permissionDenied(
        "You do not have permission to view SLA policies"
      );
    }

    const policies = await slaRepository.findAllPolicies();

    return {
      policies: policies.map((p) => ({
        id: p.id,
        urgency: p.urgency,
        responseTimeMinutes: p.responseTimeMinutes,
        isActive: p.isActive,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      })),
    };
  }
);

interface UpdatePolicyResponse {
  policy: SlaPolicyResponse;
}

/**
 * Update an SLA policy
 */
export const updatePolicy = api<UpdateSlaPolicyRequest, UpdatePolicyResponse>(
  {
    expose: true,
    method: "PUT",
    path: "/sla/policies/:id",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();

    // Only ADMIN can update SLA policies
    if (userContext.role !== "ADMIN") {
      throw APIError.permissionDenied(
        "You do not have permission to update SLA policies"
      );
    }

    const policy = await slaRepository.updatePolicy(req.id, {
      responseTimeMinutes: req.responseTimeMinutes,
      isActive: req.isActive,
    });

    if (!policy) {
      throw APIError.notFound("SLA policy not found");
    }

    return {
      policy: {
        id: policy.id,
        urgency: policy.urgency,
        responseTimeMinutes: policy.responseTimeMinutes,
        isActive: policy.isActive,
        createdAt: policy.createdAt.toISOString(),
        updatedAt: policy.updatedAt.toISOString(),
      },
    };
  }
);
