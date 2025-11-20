"use client";

import { useCallback, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { useFetchAllTemplatesQuery } from "@/hooks/use-templates";
import { API_BASE } from "@/lib/api/utils";
import NotificationTemplates from "@/components/templates/notification-templates";
import { useQueryClient } from "@tanstack/react-query";

export default function NotificationTemplatesPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const { data: templateData, isLoading } = useFetchAllTemplatesQuery({
    role: "ADMIN",
    queryKey: ["notification-templates"],
  });

  const invalidateFetchAllUserNotifications = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: ["notification-templates"],
    });
  }, [queryClient]);

  const handleResetAllToDefault = async () => {
    setIsSubmitting(true);
    try {
      const token = await getToken();
      if (!token) {
        console.error("Failed to get authentication token");
        return;
      }
      const response = await fetch(
        `${API_BASE}/notifications/templates/reset-all`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
    } catch (error) {
      console.error("Error resetting notification templates:", error);
    } finally {
      await invalidateFetchAllUserNotifications();
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">
            Admin: Notification Templates ({templateData?.length || 0})
          </h1>
          <Button
            onClick={handleResetAllToDefault}
            disabled={isLoading || isSubmitting}
          >
            Reset All to Default
          </Button>
        </div>
        <p className="text-muted-foreground">
          Customize in-app notifications for market centers, tickets,
          categories, and comments
        </p>
      </div>
      <NotificationTemplates
        notificationTemplates={templateData || []}
        isLoading={isLoading || isSubmitting}
        refreshTemplates={invalidateFetchAllUserNotifications}
      />
    </div>
  );
}
