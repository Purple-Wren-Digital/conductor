import { NotificationCategory } from "../types";

// =============================================================================
// TEMPLATE TYPES - All customizable notification template types
// =============================================================================

/**
 * Enum of all notification types that can have customized templates.
 * These map to the "type" field in notifications.
 */
export type CustomizableTemplateType =
  | "ticket_created"
  | "ticket_updated"
  | "ticket_assignment"
  | "new_comments"
  | "market_center_assignment"
  | "category_assignment"
  | "ticket_survey"
  | "ticket_survey_results";

/**
 * Maps template types to their human-readable names for the UI
 */
export const TEMPLATE_TYPE_LABELS: Record<CustomizableTemplateType, string> = {
  ticket_created: "Ticket Created",
  ticket_updated: "Ticket Updated",
  ticket_assignment: "Ticket Assignment",
  new_comments: "New Comment",
  market_center_assignment: "Market Center Assignment",
  category_assignment: "Category Assignment",
  ticket_survey: "Ticket Survey",
  ticket_survey_results: "Survey Results",
};

/**
 * Maps template types to their notification trigger names (for compatibility)
 */
export const TEMPLATE_TYPE_TO_TRIGGER: Record<
  CustomizableTemplateType,
  string
> = {
  ticket_created: "Ticket Created",
  ticket_updated: "Ticket Updated",
  ticket_assignment: "Ticket Assignment",
  new_comments: "New Comments",
  market_center_assignment: "Market Center Assignment",
  category_assignment: "Category Assignment",
  ticket_survey: "Ticket Survey",
  ticket_survey_results: "Ticket Survey Results",
};

// =============================================================================
// VARIABLE DEFINITIONS - What data can be inserted into templates
// =============================================================================

export interface TemplateVariable {
  key: string; // The variable key, e.g., "ticket_title"
  label: string; // Human-readable name, e.g., "Ticket Title"
  description: string; // Help text, e.g., "The title of the ticket"
  example: string; // Example value for preview, e.g., "Login Issue"
}

/**
 * Available variables for each template type.
 * Used to populate the variable picker in the UI and for validation.
 */
export const TEMPLATE_VARIABLES: Record<
  CustomizableTemplateType,
  TemplateVariable[]
> = {
  ticket_created: [
    {
      key: "ticket_title",
      label: "Ticket Title",
      description: "The title of the ticket",
      example: "Login Issue",
    },
    {
      key: "due_date",
      label: "Due Date",
      description: "When the ticket is due",
      example: "Mar 26, 2024",
    },
    {
      key: "created_on",
      label: "Created Date",
      description: "When the ticket was created",
      example: "Mar 15, 2024",
    },
    {
      key: "creator_name",
      label: "Creator Name",
      description: "Name of who created the ticket",
      example: "John Smith",
    },
    {
      key: "assignee_name",
      label: "Assignee Name",
      description: "Name of who the ticket is assigned to",
      example: "Jane Doe",
    },
    {
      key: "user_name",
      label: "Recipient Name",
      description: "Name of the person receiving this notification",
      example: "John Smith",
    },
  ],
  ticket_updated: [
    {
      key: "ticket_title",
      label: "Ticket Title",
      description: "The title of the ticket",
      example: "Login Issue",
    },
    {
      key: "changed_details",
      label: "Changed Fields",
      description: "List of what was changed",
      example: "Status, Priority",
    },
    {
      key: "updated_on",
      label: "Updated Date",
      description: "When the ticket was updated",
      example: "Mar 19, 2024",
    },
    {
      key: "editor_name",
      label: "Editor Name",
      description: "Name of who made the update",
      example: "Jane Doe",
    },
    {
      key: "user_name",
      label: "Recipient Name",
      description: "Name of the person receiving this notification",
      example: "John Smith",
    },
  ],
  ticket_assignment: [
    {
      key: "ticket_title",
      label: "Ticket Title",
      description: "The title of the ticket",
      example: "Login Issue",
    },
    {
      key: "update_type",
      label: "Added or Removed",
      description: "Whether the ticket was assigned or unassigned",
      example: "removed",
    },
    {
      key: "current_assignment",
      label: "Current Assignee",
      description: "Who the ticket is now assigned to",
      example: "Jane Doe",
    },
    {
      key: "previous_assignment",
      label: "Previous Assignee",
      description: "Who the ticket was previously assigned to",
      example: "John Smith",
    },
    {
      key: "editor_name",
      label: "Assigned By",
      description: "Name of who changed the assignment",
      example: "Jane Doe",
    },
    {
      key: "user_name",
      label: "Recipient Name",
      description: "Name of the person receiving this notification",
      example: "John Smith",
    },
  ],
  new_comments: [
    {
      key: "ticket_title",
      label: "Ticket Title",
      description: "The title of the ticket",
      example: "Login Issue",
    },
    {
      key: "comment",
      label: "Comment Content",
      description: "The content of the comment",
      example: "Please update the ticket by tomorrow.",
    },
    {
      key: "is_internal",
      label: "Internal/External",
      description: "Whether the comment is marked as internal",
      example: "Internal",
    },
    {
      key: "commenter_name",
      label: "Commenter Name",
      description: "Name of who left the comment",
      example: "Jane Doe",
    },
    {
      key: "user_name",
      label: "Recipient Name",
      description: "Name of the person receiving this notification",
      example: "John Smith",
    },
  ],
  market_center_assignment: [
    {
      key: "market_center_name",
      label: "Market Center Name",
      description: "Name of the market center",
      example: "Austin Downtown",
    },
    {
      key: "user_update",
      label: "Added or Removed",
      description:
        "Whether the user was added to or removed from the market center",
      example: "added",
    },
    {
      key: "editor_name",
      label: "Changed By",
      description: "Name of who made the change",
      example: "Jane Doe",
    },
    {
      key: "user_name",
      label: "Recipient Name",
      description: "Name of the person receiving this notification",
      example: "John Smith",
    },
  ],
  category_assignment: [
    {
      key: "market_center_name",
      label: "Market Center Name",
      description: "Name of the market center",
      example: "Austin Downtown",
    },
    {
      key: "category_name",
      label: "Category Name",
      description: "Name of the ticket category",
      example: "Technical Support",
    },
    {
      key: "category_description",
      label: "Category Description",
      description: "Description of the category",
      example: "Technical issues and bugs",
    },
    {
      key: "user_update",
      label: "Added or Removed",
      description: "Whether the user was added to or removed from the category",
      example: "added",
    },
    {
      key: "editor_name",
      label: "Changed By",
      description: "Name of who made the change",
      example: "Jane Doe",
    },
    {
      key: "user_name",
      label: "Recipient Name",
      description: "Name of the person receiving this notification",
      example: "John Smith",
    },
  ],
  ticket_survey: [
    {
      key: "ticket_title",
      label: "Ticket Title",
      description: "The title of the ticket",
      example: "Login Issue",
    },
    {
      key: "surveyor_name",
      label: "Surveyor Name",
      description: "Name of the person to complete the survey",
      example: "John Smith",
    },
  ],
  ticket_survey_results: [
    {
      key: "ticket_title",
      label: "Ticket Title",
      description: "The title of the ticket",
      example: "Login Issue",
    },
    {
      key: "staff_name",
      label: "Assigned Staff Name",
      description: "Name of the staff member who handled the ticket",
      example: "Jane Doe",
    },
    {
      key: "user_name",
      label: "Recipient Name",
      description: "Name of the person receiving this notification",
      example: "John Smith",
    },
  ],
};

// =============================================================================
// EMAIL TEMPLATE VISIBLE FIELDS - What detail fields can be shown in emails
// =============================================================================

export interface EmailVisibleField {
  key: string; // Field identifier
  label: string; // Human-readable name for the toggle
  defaultVisible: boolean; // Whether it's shown by default
}

/**
 * Fields that can be toggled on/off in email detail sections.
 * Different template types have different available fields.
 */
export const EMAIL_VISIBLE_FIELDS: Record<
  CustomizableTemplateType,
  EmailVisibleField[]
> = {
  ticket_created: [
    { key: "ticket_title", label: "Ticket Title", defaultVisible: true },
    { key: "due_date", label: "Due Date", defaultVisible: true },
    { key: "assignee_name", label: "Assigned To", defaultVisible: false },
    { key: "creator_name", label: "Created By", defaultVisible: true },
    { key: "user_name", label: "Recipient Name", defaultVisible: false },
  ],
  ticket_updated: [
    { key: "ticket_title", label: "Ticket Title", defaultVisible: true },
    { key: "changed_details", label: "Changes Made", defaultVisible: true },
    { key: "updated_on", label: "Updated Date", defaultVisible: true },
    { key: "editor_name", label: "Updated By", defaultVisible: true },
    { key: "user_name", label: "Recipient Name", defaultVisible: false },
  ],
  ticket_assignment: [
    { key: "ticket_title", label: "Ticket Title", defaultVisible: true },
    { key: "update_type", label: "Added or Removed", defaultVisible: true },
    {
      key: "current_assignment",
      label: "Now Assigned To",
      defaultVisible: true,
    },
    {
      key: "previous_assignment",
      label: "Previously Assigned To",
      defaultVisible: false,
    },
    { key: "editor_name", label: "Assigned By", defaultVisible: true },
    { key: "user_name", label: "Recipient Name", defaultVisible: false },
  ],
  new_comments: [
    { key: "ticket_title", label: "Ticket Title", defaultVisible: true },
    { key: "comment", label: "Comment Text", defaultVisible: true },
    { key: "is_internal", label: "Internal Comment", defaultVisible: true },
    { key: "commenter_name", label: "Comment By", defaultVisible: true },
    { key: "user_name", label: "Recipient Name", defaultVisible: false },
  ],
  market_center_assignment: [
    { key: "market_center_name", label: "Market Center", defaultVisible: true },
    { key: "user_update", label: "Added or Removed", defaultVisible: true },
    { key: "editor_name", label: "Changed By", defaultVisible: true },
    { key: "user_name", label: "Recipient Name", defaultVisible: false },
  ],
  category_assignment: [
    { key: "market_center_name", label: "Market Center", defaultVisible: true },
    { key: "category_name", label: "Category", defaultVisible: true },
    {
      key: "category_description",
      label: "Category Description",
      defaultVisible: true,
    },
    {
      key: "user_update",
      label: "Added or Removed",
      defaultVisible: true,
    },
    { key: "editor_name", label: "Changed By", defaultVisible: true },
    { key: "user_name", label: "Recipient Name", defaultVisible: false },
  ],
  ticket_survey: [
    { key: "ticket_title", label: "Ticket Title", defaultVisible: true },
    { key: "surveyor_name", label: "Surveyor Name", defaultVisible: true },
  ],
  ticket_survey_results: [
    { key: "ticket_title", label: "Ticket Title", defaultVisible: true },
    { key: "staff_name", label: "Ticket Assignee", defaultVisible: true },
    { key: "user_name", label: "Recipient Name", defaultVisible: false },
  ],
};

// =============================================================================
// EMAIL TEMPLATE CUSTOMIZATION
// =============================================================================

export interface EmailTemplateCustomization {
  id: string;
  marketCenterId: string;
  templateType: CustomizableTemplateType;

  // Customizable content sections
  subject: string;
  greeting: string;
  mainMessage: string; // HTML from rich text editor
  buttonText: string | null; // null = hide button
  visibleFields: string[]; // Array of field keys to show

  // Metadata
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdById: string | null;
  updatedById: string | null;
}

export interface CreateEmailTemplateCustomizationInput {
  marketCenterId: string;
  templateType: CustomizableTemplateType;
  subject: string;
  greeting: string;
  mainMessage: string;
  buttonText?: string | null;
  visibleFields: string[];
}

export interface UpdateEmailTemplateCustomizationInput {
  subject?: string;
  greeting?: string;
  mainMessage?: string;
  buttonText?: string | null;
  visibleFields?: string[];
  isActive?: boolean;
}

// =============================================================================
// IN-APP TEMPLATE CUSTOMIZATION
// =============================================================================

export interface InAppTemplateCustomization {
  id: string;
  marketCenterId: string;
  templateType: CustomizableTemplateType;

  // Customizable content
  title: string;
  body: string;

  // Metadata
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdById: string | null;
  updatedById: string | null;
}

export interface CreateInAppTemplateCustomizationInput {
  marketCenterId: string;
  templateType: CustomizableTemplateType;
  title: string;
  body: string;
}

export interface UpdateInAppTemplateCustomizationInput {
  title?: string;
  body?: string;
  isActive?: boolean;
}

// =============================================================================
// DEFAULT TEMPLATES - System defaults used when no customization exists
// =============================================================================

export interface DefaultEmailTemplate {
  subject: string;
  greeting: string;
  mainMessage: string;
  buttonText: string;
  visibleFields: string[];
}

export interface DefaultInAppTemplate {
  title: string;
  body: string;
}

/**
 * Default email templates for all notification types.
 * Used when a market center hasn't customized a template.
 */
export const DEFAULT_EMAIL_TEMPLATES: Record<
  CustomizableTemplateType,
  DefaultEmailTemplate
> = {
  ticket_created: {
    subject: "New Ticket: {{ticket_title}}",
    greeting: "Hi {{user_name}},",
    mainMessage: "A new ticket has been created and needs your attention.",
    buttonText: "View Ticket",
    visibleFields: [
      "ticket_title",
      "due_date",
      "assignee_name",
      "creator_name",
      "user_name",
    ],
  },
  ticket_updated: {
    subject: "Ticket Updated: {{ticket_title}}",
    greeting: "Hi {{user_name}},",
    mainMessage:
      "A ticket you're associated with has been updated. See below for details.",
    buttonText: "View Ticket",
    visibleFields: [
      "ticket_title",
      "changed_details",
      "updated_on",
      "editor_name",
      "user_name",
    ],
  },
  ticket_assignment: {
    subject: "Ticket Assignment: {{ticket_title}}",
    greeting: "Hi {{user_name}},",
    mainMessage: "A ticket was {{update_type}} to/from your queue.",
    buttonText: "View Ticket",
    visibleFields: [
      "ticket_title",
      "update_type",
      "current_assignment",
      "previous_assignment",
      "editor_name",
      "user_name",
    ],
  },
  new_comments: {
    subject: "New Comment on '{{ticket_title}}'",
    greeting: "Hi {{user_name}},",
    mainMessage:
      "{{commenter_name}} left a new comment on a ticket you're following.",
    buttonText: "View Ticket",
    visibleFields: [
      "ticket_title",
      "comment",
      "is_internal",
      "commenter_name",
      "user_name",
    ],
  },
  market_center_assignment: {
    subject: "Market Center Update",
    greeting: "Hi {{user_name}},",
    mainMessage: "{{editor_name}} updated your market center assignment",
    buttonText: "View Details",
    visibleFields: [
      "market_center_name",
      "user_update",
      "editor_name",
      "user_name",
    ],
  },
  category_assignment: {
    subject: "Ticket Category Assignment Update: '{{category_name}}'",
    greeting: "Hi {{user_name}},",
    mainMessage:
      "You have been {{user_update}} to/from the following ticket category:",
    buttonText: "View All Categories",
    visibleFields: [
      "market_center_name",
      "category_name",
      "category_description",
      "user_update",
      "editor_name",
      "user_name",
    ],
  },
  ticket_survey: {
    subject: "How did we do? - {{ticket_title}}",
    greeting: "Hi {{surveyor_name}},",
    mainMessage:
      "Your ticket has been resolved. We'd love to hear your feedback!",
    buttonText: "Complete Survey",
    visibleFields: ["ticket_title", "surveyor_name"],
  },
  ticket_survey_results: {
    subject: "Survey Results: {{ticket_title}}",
    greeting: "Hi {{user_name}},",
    mainMessage: "A survey was completed for the following ticket:",
    buttonText: "View Survey Results",
    visibleFields: ["ticket_title", "staff_name", "user_name"],
  },
};

/**
 * Default in-app notification templates for all notification types.
 * Used when a market center hasn't customized a template.
 */
export const DEFAULT_IN_APP_TEMPLATES: Record<
  CustomizableTemplateType,
  DefaultInAppTemplate
> = {
  ticket_created: {
    title: "New Ticket: {{ticket_title}}",
    body: "{{creator_name}} created a new ticket",
  },
  ticket_updated: {
    title: "Ticket Updated: {{ticket_title}}",
    body: "{{editor_name}} updated the following: {{changed_details}}",
  },
  ticket_assignment: {
    title: "Ticket Assigned: {{ticket_title}}",
    body: "You have been {{update_type}} to/from this ticket",
  },
  new_comments: {
    title: "New Comment for '{{ticket_title}}'",
    body: "{{commenter_name}}: '{{comment}}'",
  },
  market_center_assignment: {
    title: "Market Center Update",
    body: "{{editor_name}} updated your market center assignment",
  },
  category_assignment: {
    title: "Category Assignment",
    body: "You have been '{{user_update}}' to/from the following ticket category: '{{category_name}}'",
  },
  ticket_survey: {
    title: "New Survey for '{{ticket_title}}'",
    body: "Please take a moment to provide feedback about your experience",
  },
  ticket_survey_results: {
    title: "Survey Results: {{ticket_title}}",
    body: "New feedback is available",
  },
};

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

/**
 * Template status for list views - shows whether using default or custom
 */
export interface TemplateStatus {
  templateType: CustomizableTemplateType;
  label: string;
  hasEmailCustomization: boolean;
  hasInAppCustomization: boolean;
  emailCustomization: EmailTemplateCustomization | null;
  inAppCustomization: InAppTemplateCustomization | null;
}

/**
 * Full template data with defaults for editing UI
 */
export interface TemplateWithDefaults {
  templateType: CustomizableTemplateType;
  label: string;
  variables: TemplateVariable[];

  // Email template
  emailDefault: DefaultEmailTemplate;
  emailCustomization: EmailTemplateCustomization | null;
  emailVisibleFieldOptions: EmailVisibleField[];

  // In-app template
  inAppDefault: DefaultInAppTemplate;
  inAppCustomization: InAppTemplateCustomization | null;
}
