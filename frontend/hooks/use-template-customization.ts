import { API_BASE } from "@/lib/api/utils";
import { useAuth } from "@clerk/nextjs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UserRole } from "@/lib/types";

// =============================================================================
// TYPES
// =============================================================================

export type CustomizableTemplateType =
  | "TICKET_CREATED"
  | "TICKET_UPDATED"
  | "TICKET_ASSIGNMENT"
  | "NEW_COMMENTS"
  | "MARKET_CENTER_ASSIGNMENT"
  | "CATEGORY_ASSIGNMENT"
  | "TICKET_SURVEY"
  | "TICKET_SURVEY_RESULTS";

export interface TemplateVariable {
  key: string;
  label: string;
  description: string;
  example: string;
}

export interface EmailVisibleField {
  key: string;
  label: string;
  defaultVisible: boolean;
}

export interface EmailTemplateCustomization {
  id: string;
  marketCenterId: string;
  templateType: CustomizableTemplateType;
  subject: string;
  greeting: string;
  mainMessage: string;
  buttonText: string | null;
  visibleFields: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InAppTemplateCustomization {
  id: string;
  marketCenterId: string;
  templateType: CustomizableTemplateType;
  title: string;
  body: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateStatus {
  templateType: CustomizableTemplateType;
  label: string;
  hasEmailCustomization: boolean;
  hasInAppCustomization: boolean;
  emailCustomization: EmailTemplateCustomization | null;
  inAppCustomization: InAppTemplateCustomization | null;
}

export interface EmailTemplateDefault {
  subject: string;
  greeting: string;
  mainMessage: string;
  buttonText: string;
  visibleFields: string[];
}

export interface InAppTemplateDefault {
  title: string;
  body: string;
}

export interface TemplateForEditing {
  templateType: CustomizableTemplateType;
  label: string;
  variables: TemplateVariable[];
  emailVisibleFields: EmailVisibleField[];
  emailDefault: EmailTemplateDefault;
  inAppDefault: InAppTemplateDefault;
  emailCustomization: EmailTemplateCustomization | null;
  inAppCustomization: InAppTemplateCustomization | null;
}

export interface EmailPreviewData {
  subject: string;
  greeting: string;
  mainMessage: string;
  buttonText: string | null;
  visibleFieldsData: Array<{ key: string; label: string; value: string }>;
}

export interface InAppPreviewData {
  title: string;
  body: string;
}

// =============================================================================
// QUERY KEYS
// =============================================================================

export const templateCustomizationKeys = {
  all: ["template-customizations"] as const,
  statuses: (marketCenterId: string) =>
    [...templateCustomizationKeys.all, "statuses", marketCenterId] as const,
  forEditing: (marketCenterId: string, templateType: string) =>
    [...templateCustomizationKeys.all, "edit", marketCenterId, templateType] as const,
};

// =============================================================================
// useFetchTemplateStatuses
// =============================================================================

interface UseFetchTemplateStatusesProps {
  marketCenterId: string | undefined;
  role: UserRole | undefined;
}

export function useFetchTemplateStatuses({
  marketCenterId,
  role,
}: UseFetchTemplateStatusesProps) {
  const { getToken } = useAuth();

  const canAccess = role === "ADMIN" || role === "STAFF_LEADER";

  return useQuery({
    queryKey: templateCustomizationKeys.statuses(marketCenterId ?? ""),
    queryFn: async () => {
      if (!marketCenterId) {
        throw new Error("Market center ID is required");
      }

      const token = await getToken();
      if (!token) {
        throw new Error("Failed to get authentication token");
      }

      const response = await fetch(
        `${API_BASE}/notifications/template-customizations/market-center/${marketCenterId}`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch template statuses");
      }

      const data = await response.json();
      return data.templates as TemplateStatus[];
    },
    enabled: !!marketCenterId && canAccess,
  });
}

// =============================================================================
// useFetchTemplateForEditing
// =============================================================================

interface UseFetchTemplateForEditingProps {
  marketCenterId: string | undefined;
  templateType: CustomizableTemplateType | string | undefined;
  role: UserRole | undefined;
}

export function useFetchTemplateForEditing({
  marketCenterId,
  templateType,
  role,
}: UseFetchTemplateForEditingProps) {
  const { getToken } = useAuth();

  const canAccess = role === "ADMIN" || role === "STAFF_LEADER";

  return useQuery({
    queryKey: templateCustomizationKeys.forEditing(
      marketCenterId ?? "",
      templateType ?? ""
    ),
    queryFn: async () => {
      if (!marketCenterId || !templateType) {
        throw new Error("Market center ID and template type are required");
      }

      const token = await getToken();
      if (!token) {
        throw new Error("Failed to get authentication token");
      }

      const response = await fetch(
        `${API_BASE}/notifications/template-customizations/market-center/${marketCenterId}/template/${templateType}`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch template for editing");
      }

      const data = await response.json();
      return data.template as TemplateForEditing;
    },
    enabled: !!marketCenterId && !!templateType && canAccess,
  });
}

// =============================================================================
// useSaveEmailTemplate
// =============================================================================

interface SaveEmailTemplateInput {
  marketCenterId: string;
  templateType: CustomizableTemplateType | string;
  subject: string;
  greeting: string;
  mainMessage: string;
  buttonText?: string | null;
  visibleFields: string[];
}

export function useSaveEmailTemplate() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SaveEmailTemplateInput) => {
      const token = await getToken();
      if (!token) {
        throw new Error("Failed to get authentication token");
      }

      const response = await fetch(
        `${API_BASE}/notifications/template-customizations/email`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            marketCenterId: input.marketCenterId,
            templateType: input.templateType,
            subject: input.subject,
            greeting: input.greeting,
            mainMessage: input.mainMessage,
            buttonText: input.buttonText ?? null,
            visibleFields: input.visibleFields,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to save email template");
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: templateCustomizationKeys.statuses(variables.marketCenterId),
      });
      queryClient.invalidateQueries({
        queryKey: templateCustomizationKeys.forEditing(
          variables.marketCenterId,
          variables.templateType
        ),
      });
    },
  });
}

// =============================================================================
// useSaveInAppTemplate
// =============================================================================

interface SaveInAppTemplateInput {
  marketCenterId: string;
  templateType: CustomizableTemplateType | string;
  title: string;
  body: string;
}

export function useSaveInAppTemplate() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SaveInAppTemplateInput) => {
      const token = await getToken();
      if (!token) {
        throw new Error("Failed to get authentication token");
      }

      const response = await fetch(
        `${API_BASE}/notifications/template-customizations/in-app`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            marketCenterId: input.marketCenterId,
            templateType: input.templateType,
            title: input.title,
            body: input.body,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to save in-app template");
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: templateCustomizationKeys.statuses(variables.marketCenterId),
      });
      queryClient.invalidateQueries({
        queryKey: templateCustomizationKeys.forEditing(
          variables.marketCenterId,
          variables.templateType
        ),
      });
    },
  });
}

// =============================================================================
// useResetEmailTemplate
// =============================================================================

interface ResetTemplateInput {
  marketCenterId: string;
  templateType: CustomizableTemplateType | string;
}

export function useResetEmailTemplate() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ResetTemplateInput) => {
      const token = await getToken();
      if (!token) {
        throw new Error("Failed to get authentication token");
      }

      const response = await fetch(
        `${API_BASE}/notifications/template-customizations/email/${input.marketCenterId}/${input.templateType}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to reset email template");
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: templateCustomizationKeys.statuses(variables.marketCenterId),
      });
      queryClient.invalidateQueries({
        queryKey: templateCustomizationKeys.forEditing(
          variables.marketCenterId,
          variables.templateType
        ),
      });
    },
  });
}

// =============================================================================
// useResetInAppTemplate
// =============================================================================

export function useResetInAppTemplate() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ResetTemplateInput) => {
      const token = await getToken();
      if (!token) {
        throw new Error("Failed to get authentication token");
      }

      const response = await fetch(
        `${API_BASE}/notifications/template-customizations/in-app/${input.marketCenterId}/${input.templateType}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to reset in-app template");
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: templateCustomizationKeys.statuses(variables.marketCenterId),
      });
      queryClient.invalidateQueries({
        queryKey: templateCustomizationKeys.forEditing(
          variables.marketCenterId,
          variables.templateType
        ),
      });
    },
  });
}

// =============================================================================
// usePreviewEmailTemplate
// =============================================================================

interface PreviewEmailTemplateInput {
  marketCenterId: string;
  templateType: CustomizableTemplateType | string;
  subject: string;
  greeting: string;
  mainMessage: string;
  buttonText?: string | null;
  visibleFields: string[];
}

export function usePreviewEmailTemplate() {
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async (input: PreviewEmailTemplateInput) => {
      const token = await getToken();
      if (!token) {
        throw new Error("Failed to get authentication token");
      }

      const response = await fetch(
        `${API_BASE}/notifications/template-customizations/email/preview`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            marketCenterId: input.marketCenterId,
            templateType: input.templateType,
            subject: input.subject,
            greeting: input.greeting,
            mainMessage: input.mainMessage,
            buttonText: input.buttonText ?? null,
            visibleFields: input.visibleFields,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to preview email template");
      }

      const data = await response.json();
      return { preview: data.preview as EmailPreviewData };
    },
  });
}

// =============================================================================
// usePreviewInAppTemplate
// =============================================================================

interface PreviewInAppTemplateInput {
  marketCenterId: string;
  templateType: CustomizableTemplateType | string;
  title: string;
  body: string;
}

export function usePreviewInAppTemplate() {
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async (input: PreviewInAppTemplateInput) => {
      const token = await getToken();
      if (!token) {
        throw new Error("Failed to get authentication token");
      }

      const response = await fetch(
        `${API_BASE}/notifications/template-customizations/in-app/preview`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            marketCenterId: input.marketCenterId,
            templateType: input.templateType,
            title: input.title,
            body: input.body,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to preview in-app template");
      }

      const data = await response.json();
      return { preview: data.preview as InAppPreviewData };
    },
  });
}
