import { api, APIError } from "encore.dev/api";
import { canCreateMarketCenters } from "../auth/permissions";
import { getUserContext } from "../auth/user-context";
import {
  db,
  marketCenterRepository,
  subscriptionRepository,
  userRepository,
} from "../ticket/db";
import type { MarketCenter } from "./types";
import type { User } from "../user/types";
import type { UsersToNotify } from "../notifications/types";

export const defaultTicketCategories = [
  { name: "General", description: "General inquiries and support" },
  { name: "Clients", description: "Client-related issues and questions" },
  { name: "Contracts", description: "Contract management and inquiries" },
  { name: "Financial", description: "Billing and payment issues" },
  { name: "Inspections", description: "Inspection scheduling and reports" },
  { name: "Listings", description: "Property listings and updates" },
  { name: "Maintenance", description: "Maintenance requests and tracking" },
  { name: "Onboarding", description: "New client onboarding and setup" },
  { name: "Showings", description: "Property showing appointments" },
  {
    name: "Technical Support",
    description: "Technical issues and troubleshooting",
  },
];

export interface CreateMarketCenterRequest {
  name: string;
  users?: User[];
  ticketCategories?: { name: string; description: string }[];
}

export interface CreateMarketCenterResponse {
  marketCenter: MarketCenter;
  usersToNotify?: UsersToNotify[];
}

export const create = api<
  CreateMarketCenterRequest,
  CreateMarketCenterResponse
>(
  {
    expose: true,
    method: "POST",
    path: "/marketCenters/create",
    auth: true,
  },
  async (req) => {
    const userContext = await getUserContext();

    if (!userContext?.marketCenterId && !userContext?.isSuperuser) {
      throw APIError.invalidArgument(
        "Missing primary market center ID under current subscription"
      );
    }

    const canCreate = await canCreateMarketCenters(
      userContext?.marketCenterId ?? "",
      userContext?.role,
      userContext?.isSuperuser
    );

    if (!canCreate) {
      throw APIError.permissionDenied(
        "Only Admin users under the Enterprise subscription can create market centers"
      );
    }

    if (
      !Array.isArray(req?.users) ||
      !req.users.length ||
      !req.users.find((user) => user.role === "STAFF_LEADER")
    ) {
      throw APIError.invalidArgument(
        "At least one staff leader must be assigned"
      );
    }

    const subscription = userContext?.marketCenterId
      ? await subscriptionRepository.findByMarketCenterId(
          userContext.marketCenterId
        )
      : null;
    const createdMarketCenter = await marketCenterRepository.create({
      name: req.name,
      stripeSubscriptionId:
        subscription?.planType === "ENTERPRISE"
          ? subscription?.stripeSubscriptionId
          : undefined,
      stripeCustomerId:
        subscription?.planType === "ENTERPRISE"
          ? subscription?.stripeCustomerId
          : undefined,
    });

    if (!createdMarketCenter) {
      throw APIError.internal("Failed to create market center");
    }
    let availableMarketCenters: string[];
    if (userContext?.marketCenterId) {
      availableMarketCenters =
        await subscriptionRepository.getAccessibleMarketCenterIds(
          userContext.marketCenterId
        );
    } else {
      // Superuser without a market center — the newly created one is valid
      availableMarketCenters = [createdMarketCenter.id];
    }

    if (
      !availableMarketCenters ||
      !availableMarketCenters.length ||
      !availableMarketCenters.includes(createdMarketCenter.id)
    ) {
      throw APIError.internal(
        "Failed to verify new market center is under subscription"
      );
    }

    let marketCenterHistoryLogs: Array<{
      marketCenterId: string;
      action: string;
      field?: string | null;
      previousValue?: string | null;
      newValue?: string | null;
      snapshot?: any;
      changedById?: string | null;
    }> = [];

    const numberOfMarketCenters = availableMarketCenters.length ?? 0;
    marketCenterHistoryLogs.push({
      marketCenterId: createdMarketCenter.id,
      action: "CREATE",
      field: "market center",
      newValue: `${createdMarketCenter.name}: ${numberOfMarketCenters + 1} market centers under subscription`,
      previousValue: `${numberOfMarketCenters} market centers under subscription`,
      changedById: userContext.userId,
    });

    let usersToNotify: UsersToNotify[] = [];

    let userHistoryLogs: Array<{
      userId: string;
      marketCenterId?: string | null;
      action: string;
      field?: string | null;
      previousValue?: string | null;
      newValue?: string | null;
      snapshot?: any;
      changedById?: string | null;
    }> = [];
    if (req?.users !== undefined && req?.users.length > 0) {
      for (const user of req.users) {
        await db.exec`
          UPDATE users
          SET market_center_id = ${createdMarketCenter.id}, updated_at = NOW()
          WHERE id = ${user.id}
        `;

        marketCenterHistoryLogs.push({
          marketCenterId: createdMarketCenter.id,
          action: "ADD",
          field: "team member",
          changedById: userContext.userId,
          newValue: JSON.stringify({
            id: user.id,
            name: user?.name ?? "Name not set",
          }),
          previousValue: null,
        });

        userHistoryLogs.push({
          userId: user.id,
          marketCenterId: createdMarketCenter.id,
          action: "ADD",
          field: "market center",
          newValue: JSON.stringify({
            id: createdMarketCenter.id,
            name: createdMarketCenter.name,
          }),
          previousValue: user?.marketCenterId
            ? JSON.stringify({
                id: user?.marketCenterId,
                name:
                  user?.marketCenter && user?.marketCenter?.name
                    ? user.marketCenter.name
                    : "",
              })
            : null,
          changedById: userContext.userId,
        });

        usersToNotify.push({
          id: user.id,
          email: user.email,
          name: user?.name ?? "Name not set",
          updateType: "added",
        });
      }
    }

    const categories =
      req?.ticketCategories !== undefined && req.ticketCategories.length > 0
        ? req?.ticketCategories
        : defaultTicketCategories;

    // Other initializations for the market center
    const marketCenterDefaultsAdded =
      await marketCenterRepository.initializeMarketCenterDefaults(
        createdMarketCenter.id,
        categories
      );
    if (marketCenterDefaultsAdded?.settings) {
      if (createdMarketCenter.settings?.autoClose) {
        marketCenterHistoryLogs.push({
          marketCenterId: createdMarketCenter.id,
          action: "CREATE",
          field: "autoClose",
          newValue: JSON.stringify(createdMarketCenter.settings.autoClose),
          previousValue: null,
          changedById: "SYSTEM",
        });
      }

      if (
        marketCenterDefaultsAdded.ticketCategories &&
        marketCenterDefaultsAdded.ticketCategories.length > 0
      ) {
        for (const category of marketCenterDefaultsAdded.ticketCategories) {
          marketCenterHistoryLogs.push({
            marketCenterId: createdMarketCenter.id,
            action: "CREATE",
            field: "category",
            newValue: category.name,
            previousValue: null,
            changedById:
              req?.ticketCategories !== undefined &&
              req.ticketCategories.length > 0
                ? userContext.userId
                : "SYSTEM",
          });
        }
      }
    }

    if (marketCenterHistoryLogs && marketCenterHistoryLogs.length > 0) {
      for (const log of marketCenterHistoryLogs) {
        await marketCenterRepository.createHistory(log);
      }
    }

    if (userHistoryLogs && userHistoryLogs.length > 0) {
      for (const log of userHistoryLogs) {
        await userRepository.createHistory(log);
      }
    }

    return {
      marketCenter: marketCenterDefaultsAdded
        ? marketCenterDefaultsAdded
        : createdMarketCenter,
      usersToNotify: usersToNotify,
    };
  }
);
