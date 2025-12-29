import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// =============================================================================
// MOCK SETUP
// =============================================================================

const mockUseFetchTemplateForEditing = vi.fn();
const mockSaveInAppTemplate = vi.fn();
const mockResetInAppTemplate = vi.fn();
const mockPreviewInAppTemplate = vi.fn();
const mockPush = vi.fn();
const mockBack = vi.fn();

// Mutable state for mutations
let saveMutationState = { isPending: false };
let previewMutationData: { preview: { title: string; body: string } } | null =
  null;

vi.mock("@/hooks/use-template-customization", () => ({
  useFetchTemplateForEditing: (props: unknown) =>
    mockUseFetchTemplateForEditing(props),
  useSaveInAppTemplate: () => ({
    mutate: mockSaveInAppTemplate,
    mutateAsync: mockSaveInAppTemplate,
    get isPending() {
      return saveMutationState.isPending;
    },
    isSuccess: false,
    isError: false,
  }),
  useResetInAppTemplate: () => ({
    mutate: mockResetInAppTemplate,
    mutateAsync: mockResetInAppTemplate,
    isPending: false,
  }),
  usePreviewInAppTemplate: () => ({
    mutate: mockPreviewInAppTemplate,
    mutateAsync: mockPreviewInAppTemplate,
    isPending: false,
    get data() {
      return previewMutationData;
    },
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useParams: () => ({
    marketCenterId: "mc-austin",
    templateType: "ticket_created",
  }),
  usePathname: () =>
    "/dashboard/template-customization/mc-austin/ticket_created/in-app",
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { toast as mockToast } from "sonner";

// Import after mocks
import InAppTemplateEditor from "./in-app-template-editor";

// =============================================================================
// TEST UTILITIES
// =============================================================================

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }

  Wrapper.displayName = "TestQueryClientWrapper-InAppEditor";
  return Wrapper;
}

// =============================================================================
// MOCK DATA
// =============================================================================

const mockTemplateData = {
  templateType: "ticket_created",
  label: "Ticket Created",
  variables: [
    {
      key: "user_name",
      label: "User Name",
      description: "Name of the recipient",
      example: "John Smith",
    },
    {
      key: "ticket_number",
      label: "Ticket Number",
      description: "The ticket ID",
      example: "1234",
    },
    {
      key: "ticket_title",
      label: "Ticket Title",
      description: "Title of the ticket",
      example: "Login Issue",
    },
    {
      key: "creator_name",
      label: "Creator Name",
      description: "Who created the ticket",
      example: "Jane Doe",
    },
    {
      key: "created_on",
      label: "Created On",
      description: "Date created",
      example: "January 15, 2024",
    },
  ],
  emailVisibleFields: [],
  emailDefault: {
    subject: "Default Subject",
    greeting: "Default Greeting",
    mainMessage: "<p>Default Message</p>",
    buttonText: "View Ticket",
    visibleFields: [],
  },
  inAppDefault: {
    title: "New Ticket: {{ticket_title}}",
    body: "Created by {{creator_name}}",
  },
  emailCustomization: null,
  inAppCustomization: null,
};

const mockTemplateWithCustomization = {
  ...mockTemplateData,
  inAppCustomization: {
    id: "inapp-123",
    marketCenterId: "mc-austin",
    templateType: "ticket_created",
    title: "Custom Title: {{ticket_title}}",
    body: "Custom body from {{creator_name}}",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
};

// =============================================================================
// LOADING STATE TESTS
// =============================================================================

describe("InAppTemplateEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    saveMutationState = { isPending: false };
    previewMutationData = null;
  });

  describe("Loading State", () => {
    it("should show loading skeleton while fetching template data", () => {
      mockUseFetchTemplateForEditing.mockReturnValue({
        data: undefined,
        isLoading: true,
      });

      render(<InAppTemplateEditor />, { wrapper: createWrapper() });

      const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it("should show skeleton placeholders while loading", () => {
      mockUseFetchTemplateForEditing.mockReturnValue({
        data: undefined,
        isLoading: true,
      });

      render(<InAppTemplateEditor />, { wrapper: createWrapper() });

      // During loading, skeletons are shown instead of actual content
      const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
      expect(skeletons.length).toBeGreaterThan(2);
    });
  });

  // =============================================================================
  // FORM DISPLAY TESTS
  // =============================================================================

  describe("Form Display", () => {
    it("should display template title and breadcrumb", async () => {
      mockUseFetchTemplateForEditing.mockReturnValue({
        data: mockTemplateData,
        isLoading: false,
      });

      render(<InAppTemplateEditor />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText("Ticket Created")).toBeInTheDocument();
        expect(screen.getByText(/in-app notification/i)).toBeInTheDocument();
      });
    });

    it("should display title input field", async () => {
      mockUseFetchTemplateForEditing.mockReturnValue({
        data: mockTemplateData,
        isLoading: false,
      });

      render(<InAppTemplateEditor />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
      });
    });

    it("should display body textarea", async () => {
      mockUseFetchTemplateForEditing.mockReturnValue({
        data: mockTemplateData,
        isLoading: false,
      });

      render(<InAppTemplateEditor />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByLabelText(/body/i)).toBeInTheDocument();
      });
    });

    it("should populate form with default values when no customization exists", async () => {
      mockUseFetchTemplateForEditing.mockReturnValue({
        data: mockTemplateData,
        isLoading: false,
      });

      render(<InAppTemplateEditor />, { wrapper: createWrapper() });

      await waitFor(() => {
        const titleInput = screen.getByLabelText(/title/i) as HTMLInputElement;
        const bodyInput = screen.getByLabelText(/body/i) as HTMLTextAreaElement;

        expect(titleInput.value).toBe("New Ticket: {{ticket_title}}");
        expect(bodyInput.value).toBe("Created by {{creator_name}}");
      });
    });

    it("should populate form with custom values when customization exists", async () => {
      mockUseFetchTemplateForEditing.mockReturnValue({
        data: mockTemplateWithCustomization,
        isLoading: false,
      });

      render(<InAppTemplateEditor />, { wrapper: createWrapper() });

      await waitFor(() => {
        const titleInput = screen.getByLabelText(/title/i) as HTMLInputElement;
        const bodyInput = screen.getByLabelText(/body/i) as HTMLTextAreaElement;

        expect(titleInput.value).toBe("Custom Title: {{ticket_title}}");
        expect(bodyInput.value).toBe("Custom body from {{creator_name}}");
      });
    });
  });

  // =============================================================================
  // VARIABLE INSERTION TESTS
  // =============================================================================

  describe("Variable Insertion", () => {
    it("should display all available template variables as buttons", async () => {
      mockUseFetchTemplateForEditing.mockReturnValue({
        data: mockTemplateData,
        isLoading: false,
      });

      render(<InAppTemplateEditor />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /user name/i })
        ).toBeInTheDocument();
        expect(
          screen.getByRole("button", { name: /ticket number/i })
        ).toBeInTheDocument();
        expect(
          screen.getByRole("button", { name: /ticket title/i })
        ).toBeInTheDocument();
        expect(
          screen.getByRole("button", { name: /creator name/i })
        ).toBeInTheDocument();
      });
    });

    it("should insert variable into title field when clicked", async () => {
      const user = userEvent.setup();

      mockUseFetchTemplateForEditing.mockReturnValue({
        data: mockTemplateData,
        isLoading: false,
      });

      render(<InAppTemplateEditor />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
      });

      // Clear the title field and focus it
      const titleInput = screen.getByLabelText(/title/i);
      await user.clear(titleInput);
      await user.click(titleInput);

      // Click a variable button
      const variableButton = screen.getByRole("button", {
        name: /ticket number/i,
      });
      await user.click(variableButton);

      // Check that the variable was inserted
      await waitFor(() => {
        expect((titleInput as HTMLInputElement).value).toContain(
          "{{ticket_number}}"
        );
      });
    });

    it("should insert variable into body field when focused", async () => {
      const user = userEvent.setup();

      mockUseFetchTemplateForEditing.mockReturnValue({
        data: mockTemplateData,
        isLoading: false,
      });

      render(<InAppTemplateEditor />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByLabelText(/body/i)).toBeInTheDocument();
      });

      // Clear body field and focus it
      const bodyInput = screen.getByLabelText(/body/i);
      await user.clear(bodyInput);
      await user.click(bodyInput);

      // Click a variable button
      const variableButton = screen.getByRole("button", {
        name: /creator name/i,
      });
      await user.click(variableButton);

      // Check that the variable was inserted
      await waitFor(() => {
        expect((bodyInput as HTMLTextAreaElement).value).toContain(
          "{{creator_name}}"
        );
      });
    });

    it("should show variable descriptions in tooltips", async () => {
      mockUseFetchTemplateForEditing.mockReturnValue({
        data: mockTemplateData,
        isLoading: false,
      });

      render(<InAppTemplateEditor />, { wrapper: createWrapper() });

      await waitFor(() => {
        // Variable buttons should have title attributes or tooltips with descriptions
        const variableButton = screen.getByRole("button", {
          name: /ticket title/i,
        });
        expect(variableButton).toHaveAttribute(
          "title",
          expect.stringContaining("Title of the ticket")
        );
      });
    });
  });

  // =============================================================================
  // FORM VALIDATION TESTS
  // =============================================================================

  describe("Form Validation", () => {
    it("should require title field", async () => {
      const user = userEvent.setup();

      mockUseFetchTemplateForEditing.mockReturnValue({
        data: mockTemplateData,
        isLoading: false,
      });

      render(<InAppTemplateEditor />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
      });

      // Clear the title
      const titleInput = screen.getByLabelText(/title/i);
      await user.clear(titleInput);

      // Try to save
      const saveButton = screen.getByRole("button", { name: /save/i });
      await user.click(saveButton);

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/title is required/i)).toBeInTheDocument();
      });
    });

    it("should require body field", async () => {
      const user = userEvent.setup();

      mockUseFetchTemplateForEditing.mockReturnValue({
        data: mockTemplateData,
        isLoading: false,
      });

      render(<InAppTemplateEditor />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByLabelText(/body/i)).toBeInTheDocument();
      });

      // Clear the body
      const bodyInput = screen.getByLabelText(/body/i);
      await user.clear(bodyInput);

      // Try to save
      const saveButton = screen.getByRole("button", { name: /save/i });
      await user.click(saveButton);

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/body is required/i)).toBeInTheDocument();
      });
    });

    it("should validate title length", async () => {
      const user = userEvent.setup();

      mockUseFetchTemplateForEditing.mockReturnValue({
        data: mockTemplateData,
        isLoading: false,
      });

      render(<InAppTemplateEditor />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
      });

      // Enter a very long title (> 100 chars)
      const titleInput = screen.getByLabelText(/title/i);
      await user.clear(titleInput);
      await user.type(titleInput, "A".repeat(150));

      // Try to save
      const saveButton = screen.getByRole("button", { name: /save/i });
      await user.click(saveButton);

      // Should show validation error
      await waitFor(() => {
        expect(
          screen.getByText(/title must be less than/i)
        ).toBeInTheDocument();
      });
    });

    it("should validate body length", async () => {
      const user = userEvent.setup();

      mockUseFetchTemplateForEditing.mockReturnValue({
        data: mockTemplateData,
        isLoading: false,
      });

      render(<InAppTemplateEditor />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByLabelText(/body/i)).toBeInTheDocument();
      });

      // Enter a very long body (> 200 chars)
      const bodyInput = screen.getByLabelText(/body/i);
      await user.clear(bodyInput);
      await user.type(bodyInput, "B".repeat(250));

      // Try to save
      const saveButton = screen.getByRole("button", { name: /save/i });
      await user.click(saveButton);

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/body must be less than/i)).toBeInTheDocument();
      });
    });
  });

  // =============================================================================
  // SAVE FUNCTIONALITY TESTS
  // =============================================================================

  describe("Save Functionality", () => {
    it("should call save mutation with correct data", async () => {
      const user = userEvent.setup();

      mockUseFetchTemplateForEditing.mockReturnValue({
        data: mockTemplateData,
        isLoading: false,
      });
      mockSaveInAppTemplate.mockResolvedValueOnce({ success: true });

      render(<InAppTemplateEditor />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
      });

      // The form is pre-populated with default values, so we just save
      const saveButton = screen.getByRole("button", { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockSaveInAppTemplate).toHaveBeenCalledWith(
          expect.objectContaining({
            marketCenterId: "mc-austin",
            templateType: "ticket_created",
            title: "New Ticket: {{ticket_title}}",
            body: "Created by {{creator_name}}",
          })
        );
      });
    });

    it("should show success toast after successful save", async () => {
      const user = userEvent.setup();

      mockUseFetchTemplateForEditing.mockReturnValue({
        data: mockTemplateData,
        isLoading: false,
      });

      // Mock successful save
      mockSaveInAppTemplate.mockResolvedValueOnce({
        inAppCustomization: { id: "new-id" },
      });

      render(<InAppTemplateEditor />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
      });

      const saveButton = screen.getByRole("button", { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith(
          expect.stringContaining("saved")
        );
      });
    });

    it("should show error toast on save failure", async () => {
      const user = userEvent.setup();

      mockUseFetchTemplateForEditing.mockReturnValue({
        data: mockTemplateData,
        isLoading: false,
      });

      // Mock failed save
      mockSaveInAppTemplate.mockRejectedValueOnce(new Error("Save failed"));

      render(<InAppTemplateEditor />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
      });

      const saveButton = screen.getByRole("button", { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(
          expect.stringMatching(/failed/i)
        );
      });
    });

    it("should disable save button while saving", async () => {
      // Set pending state before render
      saveMutationState.isPending = true;

      mockUseFetchTemplateForEditing.mockReturnValue({
        data: mockTemplateData,
        isLoading: false,
      });

      render(<InAppTemplateEditor />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
      });

      // Button should be disabled and show loading state
      const saveButton = screen.getByRole("button", { name: /saving/i });
      expect(saveButton).toBeDisabled();
    });
  });

  // =============================================================================
  // RESET FUNCTIONALITY TESTS
  // =============================================================================

  describe("Reset Functionality", () => {
    it("should show reset button when customization exists", async () => {
      mockUseFetchTemplateForEditing.mockReturnValue({
        data: mockTemplateWithCustomization,
        isLoading: false,
      });

      render(<InAppTemplateEditor />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /reset to default/i })
        ).toBeInTheDocument();
      });
    });

    it("should not show reset button when using defaults", async () => {
      mockUseFetchTemplateForEditing.mockReturnValue({
        data: mockTemplateData,
        isLoading: false,
      });

      render(<InAppTemplateEditor />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(
          screen.queryByRole("button", { name: /reset to default/i })
        ).not.toBeInTheDocument();
      });
    });

    it("should show confirmation dialog when reset is clicked", async () => {
      const user = userEvent.setup();

      mockUseFetchTemplateForEditing.mockReturnValue({
        data: mockTemplateWithCustomization,
        isLoading: false,
      });

      render(<InAppTemplateEditor />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /reset to default/i })
        ).toBeInTheDocument();
      });

      const resetButton = screen.getByRole("button", {
        name: /reset to default/i,
      });
      await user.click(resetButton);

      await waitFor(() => {
        expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
        expect(
          screen.getByRole("button", { name: /confirm/i })
        ).toBeInTheDocument();
        expect(
          screen.getByRole("button", { name: /cancel/i })
        ).toBeInTheDocument();
      });
    });

    it("should call reset mutation when confirmed", async () => {
      const user = userEvent.setup();

      mockUseFetchTemplateForEditing.mockReturnValue({
        data: mockTemplateWithCustomization,
        isLoading: false,
      });

      render(<InAppTemplateEditor />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /reset to default/i })
        ).toBeInTheDocument();
      });

      const resetButton = screen.getByRole("button", {
        name: /reset to default/i,
      });
      await user.click(resetButton);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /confirm/i })
        ).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole("button", { name: /confirm/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockResetInAppTemplate).toHaveBeenCalledWith({
          marketCenterId: "mc-austin",
          templateType: "ticket_created",
        });
      });
    });

    it("should populate form with defaults after reset", async () => {
      const user = userEvent.setup();

      mockUseFetchTemplateForEditing.mockReturnValue({
        data: mockTemplateWithCustomization,
        isLoading: false,
      });
      mockResetInAppTemplate.mockResolvedValueOnce({ success: true });

      render(<InAppTemplateEditor />, { wrapper: createWrapper() });

      await waitFor(() => {
        const titleInput = screen.getByLabelText(/title/i) as HTMLInputElement;
        expect(titleInput.value).toBe("Custom Title: {{ticket_title}}");
      });

      const resetButton = screen.getByRole("button", {
        name: /reset to default/i,
      });
      await user.click(resetButton);

      const confirmButton = screen.getByRole("button", { name: /confirm/i });
      await user.click(confirmButton);

      // After reset, form should show default values
      await waitFor(() => {
        const titleInput = screen.getByLabelText(/title/i) as HTMLInputElement;
        expect(titleInput.value).toBe("New Ticket: {{ticket_title}}");
      });
    });
  });

  // =============================================================================
  // PREVIEW FUNCTIONALITY TESTS
  // =============================================================================

  describe("Preview Functionality", () => {
    it("should show preview button", async () => {
      mockUseFetchTemplateForEditing.mockReturnValue({
        data: mockTemplateData,
        isLoading: false,
      });

      render(<InAppTemplateEditor />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /preview/i })
        ).toBeInTheDocument();
      });
    });

    it("should call preview mutation when preview button is clicked", async () => {
      const user = userEvent.setup();

      mockUseFetchTemplateForEditing.mockReturnValue({
        data: mockTemplateData,
        isLoading: false,
      });

      render(<InAppTemplateEditor />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /preview/i })
        ).toBeInTheDocument();
      });

      const previewButton = screen.getByRole("button", { name: /preview/i });
      await user.click(previewButton);

      await waitFor(() => {
        expect(mockPreviewInAppTemplate).toHaveBeenCalled();
      });
    });

    it("should display preview with substituted variables", async () => {
      const user = userEvent.setup();

      mockUseFetchTemplateForEditing.mockReturnValue({
        data: mockTemplateData,
        isLoading: false,
      });

      // Set up mock to set preview data when called
      mockPreviewInAppTemplate.mockImplementation(async () => {
        previewMutationData = {
          preview: {
            title: "New Ticket: Login Issue",
            body: "Created by Jane Doe",
          },
        };
        return previewMutationData;
      });

      render(<InAppTemplateEditor />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /preview/i })
        ).toBeInTheDocument();
      });

      const previewButton = screen.getByRole("button", { name: /preview/i });
      await user.click(previewButton);

      // Preview modal should show substituted values
      await waitFor(() => {
        expect(screen.getByText("New Ticket: Login Issue")).toBeInTheDocument();
        expect(screen.getByText("Created by Jane Doe")).toBeInTheDocument();
      });
    });

    it("should close preview modal when close button is clicked", async () => {
      const user = userEvent.setup();

      mockUseFetchTemplateForEditing.mockReturnValue({
        data: mockTemplateData,
        isLoading: false,
      });

      // Set up mock to set preview data when called
      mockPreviewInAppTemplate.mockImplementation(async () => {
        previewMutationData = {
          preview: {
            title: "Preview Title",
            body: "Preview Body",
          },
        };
        return previewMutationData;
      });

      render(<InAppTemplateEditor />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /preview/i })
        ).toBeInTheDocument();
      });

      const previewButton = screen.getByRole("button", { name: /preview/i });
      await user.click(previewButton);

      await waitFor(() => {
        expect(screen.getByText("Preview Title")).toBeInTheDocument();
      });

      // Close the modal - get the Close button within the dialog footer
      const dialog = screen.getByRole("dialog");
      const closeButton = dialog.querySelector(
        "button:last-of-type"
      ) as HTMLButtonElement;
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText("Preview Title")).not.toBeInTheDocument();
      });
    });
  });

  // =============================================================================
  // NAVIGATION TESTS
  // =============================================================================

  describe("Navigation", () => {
    it("should navigate back when cancel button is clicked", async () => {
      const user = userEvent.setup();

      mockUseFetchTemplateForEditing.mockReturnValue({
        data: mockTemplateData,
        isLoading: false,
      });

      render(<InAppTemplateEditor />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /cancel/i })
        ).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockBack).toHaveBeenCalled();
    });

    it("should show unsaved changes warning when navigating away with changes", async () => {
      const user = userEvent.setup();

      mockUseFetchTemplateForEditing.mockReturnValue({
        data: mockTemplateData,
        isLoading: false,
      });

      render(<InAppTemplateEditor />, { wrapper: createWrapper() });

      // Wait for form to be initialized with data
      const titleInput = await screen.findByLabelText(/title/i);
      await waitFor(() => {
        expect((titleInput as HTMLInputElement).value).toBe(
          "New Ticket: {{ticket_title}}"
        );
      });

      // Make a change - type additional content to trigger isDirty
      await user.type(titleInput, "X");

      // Try to cancel - should trigger unsaved changes dialog
      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      await user.click(cancelButton);

      // Should show warning dialog (title contains "Unsaved Changes", description contains the message)
      await waitFor(() => {
        expect(screen.getByRole("alertdialog")).toBeInTheDocument();
      });
      // Use getAllByText since both the title and description contain "unsaved changes"
      expect(screen.getAllByText(/unsaved changes/i).length).toBeGreaterThan(0);
    });

    it("should have back link to template list", async () => {
      mockUseFetchTemplateForEditing.mockReturnValue({
        data: mockTemplateData,
        isLoading: false,
      });

      render(<InAppTemplateEditor />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(
          screen.getByRole("link", { name: /back to templates/i })
        ).toBeInTheDocument();
      });
    });
  });

  // =============================================================================
  // CHARACTER COUNT TESTS
  // =============================================================================

  describe("Character Count", () => {
    it("should show character count for title", async () => {
      mockUseFetchTemplateForEditing.mockReturnValue({
        data: mockTemplateData,
        isLoading: false,
      });

      render(<InAppTemplateEditor />, { wrapper: createWrapper() });

      await waitFor(() => {
        // Should show something like "28/100" for character count
        expect(screen.getByText(/\/100/)).toBeInTheDocument();
      });
    });

    it("should show character count for body", async () => {
      mockUseFetchTemplateForEditing.mockReturnValue({
        data: mockTemplateData,
        isLoading: false,
      });

      render(<InAppTemplateEditor />, { wrapper: createWrapper() });

      await waitFor(() => {
        // Should show something like "25/200" for character count
        expect(screen.getByText(/\/200/)).toBeInTheDocument();
      });
    });

    it("should update character count as user types", async () => {
      const user = userEvent.setup();

      mockUseFetchTemplateForEditing.mockReturnValue({
        data: mockTemplateData,
        isLoading: false,
      });

      render(<InAppTemplateEditor />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
      });

      const titleInput = screen.getByLabelText(/title/i);
      await user.clear(titleInput);
      await user.type(titleInput, "Test");

      await waitFor(() => {
        expect(screen.getByText("4/100")).toBeInTheDocument();
      });
    });

    it("should show warning color when approaching limit", async () => {
      const user = userEvent.setup();

      mockUseFetchTemplateForEditing.mockReturnValue({
        data: mockTemplateData,
        isLoading: false,
      });

      render(<InAppTemplateEditor />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
      });

      const titleInput = screen.getByLabelText(/title/i);
      await user.clear(titleInput);
      await user.type(titleInput, "A".repeat(95)); // Near the 100 char limit

      await waitFor(() => {
        const charCount = screen.getByText("95/100");
        expect(charCount).toHaveClass("text-warning");
      });
    });
  });

  // =============================================================================
  // ACCESSIBILITY TESTS
  // =============================================================================

  describe("Accessibility", () => {
    it("should have proper labels for form fields", async () => {
      mockUseFetchTemplateForEditing.mockReturnValue({
        data: mockTemplateData,
        isLoading: false,
      });

      render(<InAppTemplateEditor />, { wrapper: createWrapper() });

      await waitFor(() => {
        const titleInput = screen.getByLabelText(/title/i);
        const bodyInput = screen.getByLabelText(/body/i);

        expect(titleInput).toHaveAttribute("id");
        expect(bodyInput).toHaveAttribute("id");
      });
    });

    it("should have keyboard navigation for variable buttons", async () => {
      mockUseFetchTemplateForEditing.mockReturnValue({
        data: mockTemplateData,
        isLoading: false,
      });

      render(<InAppTemplateEditor />, { wrapper: createWrapper() });

      await waitFor(() => {
        const variableButtons = screen
          .getAllByRole("button")
          .filter(
            (btn) =>
              btn.textContent?.includes("Name") ||
              btn.textContent?.includes("Number")
          );
        variableButtons.forEach((btn) => {
          expect(btn).not.toHaveAttribute("tabindex", "-1");
        });
      });
    });

    it("should announce save success to screen readers", async () => {
      const user = userEvent.setup();

      mockUseFetchTemplateForEditing.mockReturnValue({
        data: mockTemplateData,
        isLoading: false,
      });
      mockSaveInAppTemplate.mockResolvedValueOnce({
        inAppCustomization: { id: "new-id" },
      });

      render(<InAppTemplateEditor />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
      });

      const saveButton = screen.getByRole("button", { name: /save/i });
      await user.click(saveButton);

      // Toast should be accessible
      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalled();
      });
    });
  });
});
