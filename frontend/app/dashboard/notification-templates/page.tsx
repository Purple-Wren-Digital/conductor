"use client";

import { useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useFetchAllTemplatesQuery } from "@/hooks/use-templates";
import NotificationTemplates from "@/components/templates/notification-templates";
import { useQueryClient } from "@tanstack/react-query";
import { useUserRole } from "@/hooks/use-user-role";
import { MarketCenter, NotificationTemplate } from "@/lib/types";
import { useFetchAllMarketCenters } from "@/hooks/use-market-center";

interface NotificationTemplatesByMarketCenter {
  templateName: string;
  templateDescription: string;
  type: string;
  subject: string;
  body: string;
  variables?: any;
  marketCenters: {
    id: string;
    name: string;
    templateId: string;
    isActive: boolean;
  }[];
}

export default function NotificationTemplatesPage() {
  const { role } = useUserRole();
  const queryClient = useQueryClient();

  const { data: templateData, isLoading } = useFetchAllTemplatesQuery({
    role: role,
    queryKey: ["notification-templates"],
  });

  const invalidateFetchAllUserNotifications = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: ["notification-templates"],
    });
  }, [queryClient]);

  const { data: marketCenterData, isLoading: isMarketCentersLoading } =
    useFetchAllMarketCenters(role);
  const allMarketCenters: MarketCenter[] = useMemo(() => {
    return marketCenterData?.marketCenters || [];
  }, [marketCenterData]);

  const findMarketCenterNameById = useCallback(
    (id: string) => {
      const mc = allMarketCenters.find((mc) => mc.id === id);
      return mc ? mc.name : `#${id.slice(0, 8)}`;
    },
    [allMarketCenters]
  );

  const templatesWithMarketCenters: NotificationTemplatesByMarketCenter[] =
    useMemo(() => {
      if (!templateData || !allMarketCenters || !allMarketCenters.length)
        return [];

      return Object.values(
        templateData.reduce(
          (
            acc: Record<string, NotificationTemplatesByMarketCenter>,
            template: NotificationTemplate
          ) => {
            const key = template.templateName;

            if (!acc[key]) {
              acc[key] = {
                templateName: template.templateName,
                templateDescription: template.templateDescription,
                type: template.type,
                subject: template.subject,
                body: template.body,
                variables: template.variables,
                marketCenters: [],
              };
            }

            // Add market center info
            if (template.marketCenterId) {
              acc[key].marketCenters.push({
                id: template.marketCenterId,
                name: findMarketCenterNameById(template.marketCenterId),
                templateId: template.id,
                isActive: template.isActive ?? true,
              });
            }

            return acc;
          },
          {} as Record<string, NotificationTemplatesByMarketCenter>
        )
      );
    }, [templateData, allMarketCenters, findMarketCenterNameById]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Admin: Notification Templates (
          {templatesWithMarketCenters?.length || 0})
        </h1>
        <p className="text-muted-foreground">
          Customize in-app notifications for market centers, tickets,
          categories, and comments
        </p>
      </div>
      <NotificationTemplates
        notificationTemplates={templatesWithMarketCenters}
        isLoading={isLoading || isMarketCentersLoading}
        refreshTemplates={invalidateFetchAllUserNotifications}
      />
    </div>
  );
}
